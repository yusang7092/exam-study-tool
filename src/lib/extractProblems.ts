/**
 * Client-side problem extraction using Gemini API directly from the browser.
 * This bypasses Supabase Edge Function compute limits entirely.
 */

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

export interface ExtractedProblem {
  sequence_num: number
  question_text: string
  answer_type: 'mcq' | 'short' | 'essay'
  options?: string[]
  bbox_y_min?: number
  bbox_x_min?: number
  bbox_y_max?: number
  bbox_x_max?: number
}

function parseProblems(text: string): ExtractedProblem[] {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  const answerTypeMap: Record<string, ExtractedProblem['answer_type']> = {
    mcq: 'mcq', multiple_choice: 'mcq', 객관식: 'mcq', 선택형: 'mcq',
    short: 'short', short_answer: 'short', 단답형: 'short', 단답: 'short', fill: 'short',
    essay: 'essay', 서술형: 'essay', 논술: 'essay', 서술: 'essay',
  }

  const toProblems = (arr: unknown[]): ExtractedProblem[] =>
    arr
      .filter(p => p && typeof (p as Record<string, unknown>).question_text === 'string' && String((p as Record<string, unknown>).question_text).trim())
      .map((p, i) => {
        const item = p as Record<string, unknown>
        return {
          sequence_num: typeof item.sequence_num === 'number' ? item.sequence_num : Number(item.sequence_num) || (i + 1),
          question_text: String(item.question_text).trim(),
          answer_type: answerTypeMap[String(item.answer_type ?? '').toLowerCase()] ?? 'short',
          options: Array.isArray(item.options) ? item.options.map(String) : undefined,
          bbox_y_min: typeof item.bbox_y_min === 'number' ? item.bbox_y_min : undefined,
          bbox_x_min: typeof item.bbox_x_min === 'number' ? item.bbox_x_min : undefined,
          bbox_y_max: typeof item.bbox_y_max === 'number' ? item.bbox_y_max : undefined,
          bbox_x_max: typeof item.bbox_x_max === 'number' ? item.bbox_x_max : undefined,
        }
      })

  const arrStart = cleaned.indexOf('['), arrEnd = cleaned.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd !== -1) {
    try {
      const parsed = JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
      if (Array.isArray(parsed)) return toProblems(parsed)
    } catch { /* fall through */ }
  }

  const objStart = cleaned.indexOf('{'), objEnd = cleaned.lastIndexOf('}')
  if (objStart !== -1 && objEnd !== -1) {
    try {
      const parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1)) as Record<string, unknown>
      const arr = parsed.problems ?? parsed.questions ?? parsed.items ?? parsed.data
      if (Array.isArray(arr)) return toProblems(arr)
    } catch { /* fall through */ }
  }

  return []
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function extractProblemsFromBlob(
  geminiApiKey: string,
  blob: Blob,
): Promise<{ problems: ExtractedProblem[]; rawText: string }> {
  const mimeType = blob.type || 'image/jpeg'
  const base64 = await blobToBase64(blob)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: PROMPT }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API 오류 ${res.status}: ${err.slice(0, 200)}`)
  }

  const json = await res.json()
  const rawText: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const finishReason: string = json?.candidates?.[0]?.finishReason ?? ''

  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    throw new Error(`Gemini 응답 거부: ${finishReason}`)
  }

  return { problems: parseProblems(rawText), rawText }
}
