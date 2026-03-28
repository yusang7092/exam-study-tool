import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExtractRequest {
  problem_set_id: string
  page_image_paths: string[]
}

interface BBox {
  y_min: number  // 0-1000 (thousandths of image height)
  x_min: number
  y_max: number
  x_max: number
}

interface ExtractedProblem {
  sequence_num: number
  question_text: string
  answer_type: 'mcq' | 'short' | 'essay'
  options?: string[]
  bbox?: BBox | null
}

const PROMPT = `당신은 한국 시험지/문제집에서 문제를 추출하는 전문가입니다. 이미지에 있는 모든 문제를 하나도 빠짐없이 추출하세요.

【문제로 인식해야 하는 모든 패턴】
1. 번호가 있는 문제: "1.", "2.", "1번", "2번", "문1", "문2", "[1]", "(1)", "제1문" 등
2. 보기가 있는 객관식: ①②③④⑤ 또는 ㄱ.ㄴ.ㄷ. 나열
3. 지시문 뒤 하위 질문: "다음을 읽고 물음에 답하시오", "다음 글을 읽고", "예제", "보기를 보고" 다음에 나오는 (1)(2)(3) 또는 ①②③ 각각을 별도 문제로 추출
4. 서술형 지시: "~고르시오", "~쓰시오", "~구하시오", "~설명하시오", "~서술하시오", "물음에 답하시오", "답을 구하시오"
5. 빈칸 채우기: ( ), _____, [ ] 가 포함된 문장
6. 계산/풀이 요구: "계산하시오", "값을 구하시오", "풀이 과정을 쓰시오"

【추출 규칙】
- 이미지에 문제가 여러 개면 전부 추출 — 절대 하나만 추출하지 말 것
- "다음을 읽고 물음에 답하시오" 형태: 지문은 question_text 맨 앞에 포함, 하위 문제 각각을 별도 항목으로 추출
- 예제/보기가 있으면 예제 내용을 question_text에 포함
- answer_type: "mcq"=객관식(①②③보기), "short"=단답/계산, "essay"=서술/논술
- options: mcq일 때만 보기 목록, 나머지는 []
- bbox: 이미지를 1000×1000으로 봤을 때 해당 문제가 차지하는 영역 좌표

【출력: JSON만, 다른 설명 없이】
[{"sequence_num":1,"question_text":"지문 포함 전체 질문","answer_type":"mcq","options":["① 보기1","② 보기2","③ 보기3","④ 보기4","⑤ 보기5"],"bbox_y_min":50,"bbox_x_min":10,"bbox_y_max":300,"bbox_x_max":990},{"sequence_num":2,"question_text":"단답형 질문","answer_type":"short","options":[],"bbox_y_min":310,"bbox_x_min":10,"bbox_y_max":480,"bbox_x_max":990}]

문제가 없으면: []`

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const rawMime = contentType.split(';')[0].trim()
  const validMimes = ['image/jpeg', 'image/png', 'image/webp']
  const mimeType = (validMimes.includes(rawMime) ? rawMime : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'
  const arrayBuffer = await response.arrayBuffer()
  return { bytes: new Uint8Array(arrayBuffer), mimeType }
}

/**
 * Upload image to Gemini Files API and return the file URI.
 * This avoids sending large base64 payloads in generateContent requests.
 * The file is available for 48 hours on Google's servers.
 */
async function uploadToGeminiFiles(apiKey: string, bytes: Uint8Array, mimeType: string): Promise<string> {
  const boundary = `boundary${Date.now()}`
  const metaPart = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n` +
    `{"file":{"mimeType":"${mimeType}"}}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  )
  const closing = new TextEncoder().encode(`\r\n--${boundary}--`)

  const body = new Uint8Array(metaPart.length + bytes.length + closing.length)
  body.set(metaPart, 0)
  body.set(bytes, metaPart.length)
  body.set(closing, metaPart.length + bytes.length)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini Files API upload failed ${res.status}: ${err.slice(0, 200)}`)
  }
  const json = await res.json()
  const fileUri: string = json?.file?.uri
  if (!fileUri) throw new Error('Gemini Files API returned no URI')
  return fileUri
}

async function extractWithGemini(
  apiKey: string,
  bytes: Uint8Array,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<{ problems: ExtractedProblem[]; rawText: string }> {
  // Upload image to Gemini Files API — this sends raw bytes (no base64 overhead)
  // and returns a URI reference, keeping the generateContent request tiny
  const fileUri = await uploadToGeminiFiles(apiKey, bytes, mimeType)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const body = {
    contents: [
      {
        parts: [
          { fileData: { fileUri, mimeType } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const json = await res.json()
  const candidate = json?.candidates?.[0]
  const finishReason: string = candidate?.finishReason ?? 'UNKNOWN'
  const rawText: string = candidate?.content?.parts?.[0]?.text ?? ''

  console.log(`Gemini finishReason=${finishReason} rawText=${rawText.slice(0, 300)}`)

  if (finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    const blockReason = json?.promptFeedback?.blockReason ?? ''
    throw new Error(`Gemini did not complete: finishReason=${finishReason}${blockReason ? ` blockReason=${blockReason}` : ''}`)
  }

  return { problems: parseProblemsFromText(rawText), rawText }
}

async function extractWithClaude(
  apiKey: string,
  bytes: Uint8Array,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<{ problems: ExtractedProblem[]; rawText: string }> {
  // Claude requires base64 inline — encode from raw bytes
  const CHUNK = 8192
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
  }
  const base64Data = btoa(parts.join(''))

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
  const rawText: string = json?.content?.[0]?.text ?? ''
  return { problems: parseProblemsFromText(rawText), rawText }
}

function parseProblemsFromText(text: string): ExtractedProblem[] {
  // Strip markdown code fences
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  const answerTypeMap: Record<string, ExtractedProblem['answer_type']> = {
    mcq: 'mcq', multiple_choice: 'mcq', 객관식: 'mcq', '선택형': 'mcq',
    short: 'short', short_answer: 'short', 단답형: 'short', 단답: 'short', fill: 'short',
    essay: 'essay', 서술형: 'essay', 논술: 'essay', 서술: 'essay',
  }

  const toProblems = (arr: unknown[]): ExtractedProblem[] =>
    arr
      .filter((p) => p && typeof (p as Record<string, unknown>).question_text === 'string' && (String((p as Record<string, unknown>).question_text)).trim())
      .map((p, i) => {
        const item = p as Record<string, unknown>
        const yMin = typeof item.bbox_y_min === 'number' ? item.bbox_y_min : null
        const xMin = typeof item.bbox_x_min === 'number' ? item.bbox_x_min : null
        const yMax = typeof item.bbox_y_max === 'number' ? item.bbox_y_max : null
        const xMax = typeof item.bbox_x_max === 'number' ? item.bbox_x_max : null
        const bbox: BBox | null = (yMin !== null && xMin !== null && yMax !== null && xMax !== null)
          ? { y_min: yMin, x_min: xMin, y_max: yMax, x_max: xMax }
          : null
        return {
          sequence_num: typeof item.sequence_num === 'number' ? item.sequence_num : Number(item.sequence_num) || (i + 1),
          question_text: String(item.question_text).trim(),
          answer_type: answerTypeMap[String(item.answer_type ?? '').toLowerCase()] ?? 'short',
          options: Array.isArray(item.options) ? item.options.map(String) : undefined,
          bbox,
        }
      })

  // Try: direct array
  const arrStart = cleaned.indexOf('[')
  const arrEnd = cleaned.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd !== -1) {
    try {
      const parsed = JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
      if (Array.isArray(parsed) && parsed.length > 0) return toProblems(parsed)
    } catch { /* fall through */ }
  }

  // Try: object wrapping array e.g. { "problems": [...] } or { "questions": [...] }
  const objStart = cleaned.indexOf('{')
  const objEnd = cleaned.lastIndexOf('}')
  if (objStart !== -1 && objEnd !== -1) {
    try {
      const parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1)) as Record<string, unknown>
      const arr = parsed.problems ?? parsed.questions ?? parsed.items ?? parsed.data
      if (Array.isArray(arr) && arr.length > 0) return toProblems(arr)
    } catch { /* fall through */ }
  }

  console.error('Parse failed. Raw text:', text.slice(0, 800))
  return []
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
    const allProblems: (ExtractedProblem & { source_page: number })[] = []
    const debugRawTexts: string[] = []
    let globalSequence = 1

    for (let pageIndex = 0; pageIndex < page_image_paths.length; pageIndex++) {
      const imagePath = page_image_paths[pageIndex]
      // Generate signed URL for this image
      const { data: signedData, error: signedError } = await adminClient.storage
        .from('page-images')
        .createSignedUrl(imagePath, 3600)

      if (signedError || !signedData?.signedUrl) {
        console.error(`Failed to get signed URL for ${imagePath}:`, signedError)
        continue
      }

      // Fetch raw image bytes
      let imageData: { bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }
      try {
        imageData = await fetchImageBytes(signedData.signedUrl)
      } catch (err) {
        console.error(`Failed to fetch image ${imagePath}:`, err)
        continue
      }

      // Extract problems from image
      let pageProblems: ExtractedProblem[] = []
      try {
        const result = useAi === 'gemini'
          ? await extractWithGemini(apiKey, imageData.bytes, imageData.mimeType)
          : await extractWithClaude(apiKey, imageData.bytes, imageData.mimeType)
        pageProblems = result.problems
        debugRawTexts.push(result.rawText.slice(0, 500))
        console.log(`[${imagePath}] mimeType=${imageData.mimeType} problems=${pageProblems.length} raw=${result.rawText.slice(0, 200)}`)
      } catch (err) {
        console.error(`Extraction failed for ${imagePath}:`, err)
        continue
      }

      // Reassign sequence numbers globally, track source page
      for (const p of pageProblems) {
        allProblems.push({ ...p, sequence_num: globalSequence++, source_page: pageIndex + 1 })
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
        crop_rect: p.bbox
          ? { x: p.bbox.x_min / 1000, y: p.bbox.y_min / 1000, w: (p.bbox.x_max - p.bbox.x_min) / 1000, h: (p.bbox.y_max - p.bbox.y_min) / 1000 }
          : null,
        source_page: p.source_page,
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
      JSON.stringify({
        problems: insertedProblems,
        ...(insertedProblems.length === 0 && { debug_raw: debugRawTexts }),
      }),
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
