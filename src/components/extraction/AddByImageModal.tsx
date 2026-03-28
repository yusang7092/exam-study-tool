import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Problem } from '@/types/index'

interface AnalysisResult {
  question_text: string
  answer_type: 'mcq' | 'short' | 'essay'
  options: string[] | null
  correct_answer: string
  explanation: string
}

interface Props {
  onClose: () => void
  onSave: (data: Partial<Pick<Problem, 'question_text' | 'answer_type' | 'options' | 'correct_answer' | 'explanation'>>) => Promise<void>
}

export default function AddByImageModal({ onClose, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Editable fields after analysis
  const [qText, setQText] = useState('')
  const [answerType, setAnswerType] = useState<'mcq' | 'short' | 'essay'>('short')
  const [options, setOptions] = useState<string[]>([])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [explanation, setExplanation] = useState('')

  const handleFile = (file: File) => {
    const mime = file.type || 'image/jpeg'
    setMimeType(mime)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setResult(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!preview) return
    setAnalyzing(true)
    setError(null)
    try {
      const base64 = preview.split(',')[1]
      const { data, error: fnErr } = await supabase.functions.invoke('analyze-problem', {
        body: { image_base64: base64, mime_type: mimeType },
      })
      if (fnErr) {
        const ctx = (fnErr as any).context as Response | undefined
        const errText = ctx ? await ctx.text() : fnErr.message
        try { throw new Error(JSON.parse(errText).error) } catch { throw new Error(errText || fnErr.message) }
      }
      const r = data as AnalysisResult
      setResult(r)
      setQText(r.question_text)
      setAnswerType(r.answer_type)
      setOptions(r.options ?? [])
      setCorrectAnswer(r.correct_answer)
      setExplanation(r.explanation)
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 실패')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      question_text: qText,
      answer_type: answerType,
      options: answerType === 'mcq' && options.length ? options : null,
      correct_answer: correctAnswer || null,
      explanation: explanation || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300, padding: '0 0 env(safe-area-inset-bottom)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto', padding: '20px 20px 32px', fontFamily: 'system-ui, sans-serif' }}
      >
        <div style={{ width: 36, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>이미지로 문제 추가</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9ca3af', cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        {/* Upload area */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${preview ? '#6366f1' : '#d1d5db'}`,
            borderRadius: 12, padding: preview ? 0 : '32px 20px',
            textAlign: 'center', cursor: 'pointer', marginBottom: 14,
            background: preview ? '#000' : '#f9fafb', overflow: 'hidden',
          }}
        >
          {preview ? (
            <img src={preview} alt="업로드된 이미지" style={{ width: '100%', maxHeight: 260, objectFit: 'contain' }} />
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>이미지 선택 또는 촬영</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>문제가 찍힌 사진을 올려주세요</div>
            </>
          )}
        </div>

        {preview && !result && (
          <button
            onClick={() => void handleAnalyze()}
            disabled={analyzing}
            style={{
              width: '100%', padding: '14px', background: analyzing ? '#a5b4fc' : '#6366f1',
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: analyzing ? 'default' : 'pointer', marginBottom: 14,
            }}
          >
            {analyzing ? '🤖 AI가 분석 중...' : '🔍 AI로 문제 분석'}
          </button>
        )}

        {error && (
          <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, fontSize: 12, color: '#166534' }}>
              ✅ AI 분석 완료 — 아래 내용을 확인하고 저장하세요
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>문제 텍스트</label>
              <textarea value={qText} onChange={e => setQText(e.target.value)} rows={4}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>문제 유형</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['mcq', 'short', 'essay'] as const).map(t => (
                  <button key={t} onClick={() => setAnswerType(t)}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer', border: '1.5px solid',
                      borderColor: answerType === t ? '#6366f1' : '#e5e7eb',
                      background: answerType === t ? '#eff6ff' : '#fff',
                      color: answerType === t ? '#6366f1' : '#6b7280',
                    }}>
                    {t === 'mcq' ? '객관식' : t === 'short' ? '단답형' : '서술형'}
                  </button>
                ))}
              </div>
            </div>

            {answerType === 'mcq' && options.length > 0 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>보기</label>
                {options.map((opt, i) => (
                  <input key={i} value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
                    style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 4, boxSizing: 'border-box' }} />
                ))}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', display: 'block', marginBottom: 4 }}>정답</label>
              <input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1.5px solid #86efac', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', display: 'block', marginBottom: 4 }}>해설</label>
              <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={4}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1.5px solid #bfdbfe', borderRadius: 8, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => { setResult(null); setPreview(null) }}
                style={{ flex: 1, padding: '12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                다시 분석
              </button>
              <button onClick={() => void handleSave()} disabled={saving || !qText.trim()}
                style={{ flex: 2, padding: '12px', background: saving ? '#a5b4fc' : '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
