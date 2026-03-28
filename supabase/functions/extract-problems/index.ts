import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173'
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExtractRequest {
  problem_set_id: string
  page_image_paths: string[]
}

interface ExtractedProblem {
  sequence_num: number
  question_text: string
  answer_type: 'mcq' | 'short' | 'essay'
  options?: string[]
}

const PROMPT = `이 이미지에서 시험 문제들을 추출해주세요. 각 문제에 대해 다음 JSON 형식으로 반환하세요:
[{
  "sequence_num": 1,
  "question_text": "문제 텍스트",
  "answer_type": "mcq" | "short" | "essay",
  "options": ["①...", "②...", "③...", "④...", "⑤..."]
}]
JSON만 반환하고 다른 텍스트는 포함하지 마세요.`

async function fetchImageData(url: string): Promise<{ base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const mimeType = contentType.split(';')[0].trim() as 'image/jpeg' | 'image/png' | 'image/webp'
  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return { base64: btoa(binary), mimeType }
}

async function extractWithGemini(
  apiKey: string,
  base64Data: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<ExtractedProblem[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          { text: PROMPT },
        ],
      },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return parseProblemsFromText(text)
}

async function extractWithClaude(
  apiKey: string,
  base64Data: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<ExtractedProblem[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64Data },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const text: string = json?.content?.[0]?.text ?? ''
  return parseProblemsFromText(text)
}

function parseProblemsFromText(text: string): ExtractedProblem[] {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Find first '[' and last ']'
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1) return []
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p) =>
        typeof p.sequence_num === 'number' &&
        typeof p.question_text === 'string' &&
        ['mcq', 'short', 'essay'].includes(p.answer_type)
    )
  } catch {
    return []
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: ExtractRequest = await req.json()
    const { problem_set_id, page_image_paths } = body

    if (!problem_set_id || !Array.isArray(page_image_paths)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: problem_set_id, page_image_paths' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read user settings (API key + preferred_ai)
    const { data: settings, error: settingsError } = await adminClient
      .from('user_settings')
      .select('gemini_api_key, claude_api_key, preferred_ai')
      .eq('id', user.id)
      .single()

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'User settings not found. Please configure your API key in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const preferredAi = settings.preferred_ai ?? 'gemini'
    const geminiKey: string | null = settings.gemini_api_key
    const claudeKey: string | null = settings.claude_api_key

    // Determine which API to use
    let useAi: 'gemini' | 'claude' = preferredAi
    if (useAi === 'gemini' && !geminiKey) {
      if (claudeKey) useAi = 'claude'
      else throw new Error('No API key found. Please add a Gemini or Claude API key in Settings.')
    } else if (useAi === 'claude' && !claudeKey) {
      if (geminiKey) useAi = 'gemini'
      else throw new Error('No API key found. Please add a Gemini or Claude API key in Settings.')
    }

    const apiKey = useAi === 'gemini' ? geminiKey! : claudeKey!

    // Also fetch problem_set to get subject_id (ownership check via user_id)
    const { data: problemSet, error: psError } = await adminClient
      .from('problem_sets')
      .select('subject_id, user_id')
      .eq('id', problem_set_id)
      .eq('user_id', user.id)
      .single()

    if (psError || !problemSet) {
      throw new Error('Problem set not found')
    }

    const subjectId: string = problemSet.subject_id

    // Process each page image
    const allProblems: ExtractedProblem[] = []
    let globalSequence = 1

    for (const imagePath of page_image_paths) {
      // Generate signed URL for this image
      const { data: signedData, error: signedError } = await adminClient.storage
        .from('page-images')
        .createSignedUrl(imagePath, 3600)

      if (signedError || !signedData?.signedUrl) {
        console.error(`Failed to get signed URL for ${imagePath}:`, signedError)
        continue
      }

      // Fetch image as base64 with MIME type detection
      let imageData: { base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }
      try {
        imageData = await fetchImageData(signedData.signedUrl)
      } catch (err) {
        console.error(`Failed to fetch image ${imagePath}:`, err)
        continue
      }

      // Extract problems from image
      let pageProblems: ExtractedProblem[] = []
      try {
        if (useAi === 'gemini') {
          pageProblems = await extractWithGemini(apiKey, imageData.base64, imageData.mimeType)
        } else {
          pageProblems = await extractWithClaude(apiKey, imageData.base64, imageData.mimeType)
        }
      } catch (err) {
        console.error(`Extraction failed for ${imagePath}:`, err)
        continue
      }

      // Reassign sequence numbers globally
      for (const p of pageProblems) {
        allProblems.push({ ...p, sequence_num: globalSequence++ })
      }
    }

    // Insert problems into database
    const insertedProblems = []
    if (allProblems.length > 0) {
      const rows = allProblems.map((p) => ({
        problem_set_id,
        user_id: user.id,
        subject_id: subjectId,
        sequence_num: p.sequence_num,
        question_text: p.question_text,
        answer_type: p.answer_type,
        options: p.answer_type === 'mcq' ? (p.options ?? null) : null,
        correct_answer: null,
        image_url: null,
        crop_rect: null,
        source_page: null,
      }))

      const { data: inserted, error: insertError } = await adminClient
        .from('problems')
        .insert(rows)
        .select()

      if (insertError) {
        throw new Error(`Failed to insert problems: ${insertError.message}`)
      }

      insertedProblems.push(...(inserted ?? []))
    }

    // Update problem_set status to 'reviewing'
    await adminClient
      .from('problem_sets')
      .update({ status: 'reviewing' })
      .eq('id', problem_set_id)

    return new Response(
      JSON.stringify({ problems: insertedProblems }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('extract-problems error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
