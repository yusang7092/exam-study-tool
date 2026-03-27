import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173'
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CheckEssayRequest {
  attempt_id: string
  problem_id: string
  user_answer: string
  essay_image_path?: string
}

interface GradeResult {
  is_correct: boolean
  score: number
  feedback: string
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const mimeType = contentType.split(';')[0].trim()
  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return { base64: btoa(binary), mimeType }
}

async function gradeWithGemini(
  apiKey: string,
  rubric: string,
  userAnswer: string,
  imageBase64?: string,
  imageMimeType?: string,
  essayImageBase64?: string,
  essayImageMimeType?: string
): Promise<GradeResult> {
  const prompt = essayImageBase64
    ? `채점 기준: ${rubric}\n학생이 다음 이미지에 손으로 답안을 작성했습니다. 이 답안을 채점해주세요.\nJSON으로만 응답: {"is_correct": true/false, "score": 0-100, "feedback": "피드백"}`
    : `채점 기준: ${rubric}\n학생 답안: ${userAnswer}\n이 답안을 채점해주세요. JSON으로 응답: {"is_correct": true/false, "score": 0-100, "feedback": "피드백 텍스트"}`

  const parts: unknown[] = []
  if (imageBase64 && imageMimeType) {
    parts.push({ inline_data: { mime_type: imageMimeType, data: imageBase64 } })
  }
  if (essayImageBase64 && essayImageMimeType) {
    parts.push({ inline_data: { mime_type: essayImageMimeType, data: essayImageBase64 } })
  }
  parts.push({ text: prompt })

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  const body = { contents: [{ parts }] }

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
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as GradeResult
}

async function gradeWithClaude(
  apiKey: string,
  rubric: string,
  userAnswer: string,
  imageBase64?: string,
  imageMimeType?: string,
  essayImageBase64?: string,
  essayImageMimeType?: string
): Promise<GradeResult> {
  const prompt = essayImageBase64
    ? `채점 기준: ${rubric}\n학생이 다음 이미지에 손으로 답안을 작성했습니다. 이 답안을 채점해주세요.\nJSON으로만 응답: {"is_correct": true/false, "score": 0-100, "feedback": "피드백"}`
    : `채점 기준: ${rubric}\n학생 답안: ${userAnswer}\n이 답안을 채점해주세요. JSON으로 응답: {"is_correct": true/false, "score": 0-100, "feedback": "피드백 텍스트"}`

  const content: unknown[] = []
  if (imageBase64 && imageMimeType) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMimeType, data: imageBase64 },
    })
  }
  if (essayImageBase64 && essayImageMimeType) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: essayImageMimeType, data: essayImageBase64 },
    })
  }
  content.push({ type: 'text', text: prompt })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const text: string = json?.content?.[0]?.text ?? '{}'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as GradeResult
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

    const body: CheckEssayRequest = await req.json()
    const { attempt_id, problem_id, user_answer, essay_image_path } = body

    if (!attempt_id || !problem_id || user_answer === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: attempt_id, problem_id, user_answer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read user settings
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

    const useAi: string = settings.preferred_ai ?? 'gemini'
    const apiKey: string | null = useAi === 'gemini' ? settings.gemini_api_key : settings.claude_api_key
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `No ${useAi} API key found in settings.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch problem
    const { data: problem, error: problemError } = await adminClient
      .from('problems')
      .select('correct_answer, image_url')
      .eq('id', problem_id)
      .single()

    if (problemError || !problem) {
      throw new Error('Problem not found')
    }

    const rubric = problem.correct_answer ?? '정답 기준 없음'

    // Fetch image if available
    let imageBase64: string | undefined
    let imageMimeType: string | undefined

    if (problem.image_url) {
      try {
        const { data: signedData } = await adminClient.storage
          .from('page-images')
          .createSignedUrl(problem.image_url, 3600)

        if (signedData?.signedUrl) {
          const imgData = await fetchImageAsBase64(signedData.signedUrl)
          imageBase64 = imgData.base64
          imageMimeType = imgData.mimeType
        }
      } catch (err) {
        console.error('Failed to fetch problem image:', err)
      }
    }

    // Fetch essay image (student's handwritten answer) if provided
    let essayImageBase64: string | undefined
    let essayImageMimeType: string | undefined

    if (essay_image_path) {
      try {
        const { data: essaySignedData } = await adminClient.storage
          .from('page-images')
          .createSignedUrl(essay_image_path, 3600)

        if (essaySignedData?.signedUrl) {
          const essayImgData = await fetchImageAsBase64(essaySignedData.signedUrl)
          essayImageBase64 = essayImgData.base64
          essayImageMimeType = essayImgData.mimeType
        }
      } catch (err) {
        console.error('Failed to fetch essay image:', err)
      }
    }

    // Grade the answer
    let result: GradeResult
    if (useAi === 'gemini') {
      result = await gradeWithGemini(apiKey, rubric, user_answer, imageBase64, imageMimeType, essayImageBase64, essayImageMimeType)
    } else {
      result = await gradeWithClaude(apiKey, rubric, user_answer, imageBase64, imageMimeType, essayImageBase64, essayImageMimeType)
    }

    // Update attempt row
    await adminClient
      .from('attempts')
      .update({
        is_correct: result.is_correct,
        ai_feedback: result.feedback,
      })
      .eq('id', attempt_id)

    return new Response(
      JSON.stringify({ is_correct: result.is_correct, score: result.score, feedback: result.feedback }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('check-essay-answer error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
