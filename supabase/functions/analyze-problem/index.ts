import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*'
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ANALYZE_PROMPT = `당신은 시험 문제 분석 전문가입니다. 이 이미지에 있는 문제를 분석하세요.

다음을 수행하세요:
1. 문제 텍스트 전체를 추출하세요 (지문/보기 포함)
2. 문제 유형을 판단하세요 (객관식/단답형/서술형)
3. 객관식이면 모든 보기를 추출하세요
4. 정답을 구하세요
5. 상세한 해설을 작성하세요 (왜 그 답인지, 핵심 개념 포함)

이미지에 여러 문제가 있으면 가장 완전하게 보이는 문제 하나를 분석하세요.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: { user }, error: authError } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { image_base64, mime_type } = await req.json() as { image_base64: string; mime_type: string }
    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'Missing image_base64' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get user API key
    const { data: settings } = await adminClient.from('user_settings').select('gemini_api_key, claude_api_key, preferred_ai').eq('id', user.id).single()
    const useAi = settings?.preferred_ai ?? 'gemini'
    const apiKey = useAi === 'claude' ? settings?.claude_api_key : settings?.gemini_api_key
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const validMime = ['image/jpeg', 'image/png', 'image/webp']
    const safeMime = (validMime.includes(mime_type) ? mime_type : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

    let result: AnalysisResult
    if (useAi === 'claude') {
      result = await analyzeWithClaude(apiKey, image_base64, safeMime)
    } else {
      result = await analyzeWithGemini(apiKey, image_base64, safeMime)
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('analyze-problem error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

interface AnalysisResult {
  question_text: string
  answer_type: 'mcq' | 'short' | 'essay'
  options: string[] | null
  correct_answer: string
  explanation: string
}

async function analyzeWithGemini(apiKey: string, base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<AnalysisResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const body = {
    contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: ANALYZE_PROMPT }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
      responseSchema: {
        type: 'OBJECT',
        properties: {
          question_text: { type: 'STRING', description: '문제 전체 텍스트 (지문 포함)' },
          answer_type: { type: 'STRING', enum: ['mcq', 'short', 'essay'] },
          options: { type: 'ARRAY', items: { type: 'STRING' }, description: '객관식 보기 (mcq만)' },
          correct_answer: { type: 'STRING', description: '정답' },
          explanation: { type: 'STRING', description: '상세 해설 (풀이 과정 및 핵심 개념)' },
        },
        propertyOrdering: ['question_text', 'answer_type', 'options', 'correct_answer', 'explanation'],
        required: ['question_text', 'answer_type', 'correct_answer', 'explanation'],
      },
    },
  }

  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`)
  }
  const json = await res.json()
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  const parsed = JSON.parse(text) as Partial<AnalysisResult>
  return {
    question_text: parsed.question_text ?? '',
    answer_type: parsed.answer_type ?? 'short',
    options: Array.isArray(parsed.options) && parsed.options.length > 0 ? parsed.options : null,
    correct_answer: parsed.correct_answer ?? '',
    explanation: parsed.explanation ?? '',
  }
}

async function analyzeWithClaude(apiKey: string, base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<AnalysisResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: ANALYZE_PROMPT + '\n\n반드시 JSON만 출력하세요: {"question_text":"...","answer_type":"mcq|short|essay","options":["..."],"correct_answer":"...","explanation":"..."}' },
        ],
      }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err.slice(0, 200)}`)
  }
  const json = await res.json()
  const text: string = json?.content?.[0]?.text ?? '{}'
  const start = text.indexOf('{'), end = text.lastIndexOf('}')
  const parsed = JSON.parse(start !== -1 ? text.slice(start, end + 1) : text) as Partial<AnalysisResult>
  return {
    question_text: parsed.question_text ?? '',
    answer_type: parsed.answer_type ?? 'short',
    options: Array.isArray(parsed.options) && parsed.options.length > 0 ? parsed.options : null,
    correct_answer: parsed.correct_answer ?? '',
    explanation: parsed.explanation ?? '',
  }
}
