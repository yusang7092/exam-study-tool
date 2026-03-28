import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import { supabase } from '@/lib/supabase'
import { APP_VERSION, PATCH_NOTES } from '@/lib/version'

type Provider = 'gemini' | 'claude'

const PRESET_COLORS = [
  // Reds / Pinks
  '#ef4444', '#f97316', '#ec4899', '#f43f5e',
  // Yellows / Greens
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  // Teals / Blues
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  // Purples / Indigos
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  // Neutrals
  '#64748b', '#374151',
]

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function SpectrumPicker({ onSelect, onClose }: { value: string; onSelect: (c: string) => void; onClose: () => void }) {
  const [hue, setHue] = useState(210)
  const [lightness, setLightness] = useState(55)
  const pickerRef = useRef<HTMLDivElement>(null)
  const preview = hslToHex(hue, 75, lightness)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={pickerRef}
      style={{
        position: 'absolute', zIndex: 300, top: 'calc(100% + 8px)', left: 0, right: 0,
        background: '#fff', borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '16px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>색상 스펙트럼</div>

      {/* Hue rainbow slider */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>색조</div>
        <input
          type="range" min={0} max={359} value={hue}
          onChange={e => setHue(Number(e.target.value))}
          style={{
            width: '100%', height: 20, borderRadius: 10, cursor: 'pointer',
            appearance: 'none', outline: 'none', border: 'none',
            background: 'linear-gradient(to right, hsl(0,75%,55%), hsl(30,75%,55%), hsl(60,75%,55%), hsl(90,75%,55%), hsl(120,75%,55%), hsl(150,75%,55%), hsl(180,75%,55%), hsl(210,75%,55%), hsl(240,75%,55%), hsl(270,75%,55%), hsl(300,75%,55%), hsl(330,75%,55%), hsl(360,75%,55%))',
          }}
        />
      </div>

      {/* Lightness slider */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>밝기</div>
        <input
          type="range" min={25} max={75} value={lightness}
          onChange={e => setLightness(Number(e.target.value))}
          style={{
            width: '100%', height: 20, borderRadius: 10, cursor: 'pointer',
            appearance: 'none', outline: 'none', border: 'none',
            background: `linear-gradient(to right, hsl(${hue},75%,25%), hsl(${hue},75%,50%), hsl(${hue},75%,75%))`,
          }}
        />
      </div>

      {/* Preview + confirm */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: preview, border: '2px solid #e5e7eb', flexShrink: 0,
        }} />
        <div style={{ flex: 1, fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>{preview}</div>
        <button
          onClick={() => { onSelect(preview); onClose() }}
          style={{
            padding: '8px 16px', background: preview, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          선택
        </button>
      </div>
    </div>
  )
}

// ─── Shared style tokens ──────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e8e8e8',
  borderRadius: 8,
  padding: '24px 20px',
  marginBottom: 20,
}

const sectionTitle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 14,
  fontWeight: 600,
  color: '#111',
  letterSpacing: -0.1,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#666',
  marginBottom: 6,
  letterSpacing: 0.2,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#111',
  background: '#fff',
}

const btnPrimary: React.CSSProperties = {
  padding: '9px 20px',
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: 0.2,
}

const btnDanger: React.CSSProperties = {
  padding: '6px 10px',
  background: 'transparent',
  color: '#dc2626',
  border: '1px solid #fca5a5',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnOutline: React.CSSProperties = {
  padding: '9px 20px',
  background: 'transparent',
  color: '#111',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

// ─── API Key Guide Modal ──────────────────────────────────────────────────────
function ApiKeyGuideModal({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const isGemini = provider === 'gemini'

  const steps = isGemini
    ? [
        { icon: '🌐', text: '아래 링크를 눌러 Google AI Studio에 접속하세요.' },
        { icon: '🔑', text: '"Create API key" 버튼을 클릭하세요.' },
        { icon: '📁', text: '프로젝트 선택 화면이 나오면 드롭다운에서 "새 프로젝트 만들기"를 클릭하세요. (처음 사용 시 또는 새 계정)' },
        { icon: '📋', text: '생성된 키를 복사하세요.' },
        { icon: '💾', text: '이 페이지로 돌아와 붙여넣기 후 저장하세요.' },
      ]
    : [
        { icon: '🌐', text: '아래 링크를 눌러 Anthropic Console에 접속하세요.' },
        { icon: '👤', text: '회원가입 또는 로그인 후 Settings로 이동하세요.' },
        { icon: '🔑', text: '"API Keys" 탭에서 "Create Key" 버튼을 클릭하세요.' },
        { icon: '📋', text: '생성된 키를 복사하세요 (한 번만 표시됩니다!).' },
        { icon: '💾', text: '이 페이지로 돌아와 붙여넣기 후 저장하세요.' },
      ]

  const link = isGemini
    ? 'https://aistudio.google.com/app/apikey'
    : 'https://console.anthropic.com/settings/keys'

  const freeNote = isGemini
    ? '✅ Gemini는 무료 티어 제공 (하루 1500회, 분당 15회 무료)'
    : '💳 Claude는 유료 플랜 필요 (소액 충전 후 사용 가능)'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 10, padding: '24px 20px',
          maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid #e8e8e8',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111' }}>
            {isGemini ? 'Gemini' : 'Claude'} API 키 발급 방법
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999', padding: '0 4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Free note */}
        <div style={{ background: '#f7f7f7', border: '1px solid #e8e8e8', borderRadius: 6, padding: '9px 12px', marginBottom: 20, fontSize: 12, color: '#555' }}>
          {freeNote}
        </div>

        {/* Steps */}
        <ol style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
          {steps.map((step, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <span style={{
                minWidth: 22, height: 22, borderRadius: '50%',
                background: '#111', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 13, color: '#444', lineHeight: 1.6, paddingTop: 2 }}>
                {step.text}
              </span>
            </li>
          ))}
        </ol>

        {/* Link button */}
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center',
            padding: '11px 20px', background: '#111', color: '#fff',
            borderRadius: 6, fontSize: 13, fontWeight: 500,
            textDecoration: 'none', marginBottom: 8,
            letterSpacing: 0.2,
          }}
        >
          {isGemini ? 'Google AI Studio 바로가기 →' : 'Anthropic Console 바로가기 →'}
        </a>
        <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', margin: 0 }}>
          새 탭에서 열립니다
        </p>
      </div>
    </div>
  )
}

// ─── Section 1: API Key ───────────────────────────────────────────────────────
function ApiKeySection({ userId }: { userId: string }) {
  const [provider, setProvider] = useState<Provider>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoadingSettings(true)
      const { data } = await supabase
        .from('user_settings')
        .select('preferred_ai, gemini_api_key, claude_api_key')
        .eq('id', userId)
        .single()
      if (data) {
        const pref: Provider = data.preferred_ai === 'claude' ? 'claude' : 'gemini'
        setProvider(pref)
        setApiKey(pref === 'claude' ? (data.claude_api_key ?? '') : (data.gemini_api_key ?? ''))
      }
      setLoadingSettings(false)
    }
    void fetch()
  }, [userId])

  // When user switches provider, reload the stored key for that provider
  const handleProviderChange = async (p: Provider) => {
    setProvider(p)
    setApiKey('')
    setFeedback(null)
    const col = p === 'gemini' ? 'gemini_api_key' : 'claude_api_key'
    const { data, error: fetchErr } = await supabase
      .from('user_settings')
      .select(col)
      .eq('id', userId)
      .single()
    if (fetchErr) {
      setFeedback({ type: 'error', msg: 'API 키를 불러오지 못했습니다.' })
      return
    }
    setApiKey((data as Record<string, string | null>)?.[col] ?? '')
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setFeedback({ type: 'error', msg: 'API 키를 입력해주세요.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    const keyField = provider === 'gemini' ? 'gemini_api_key' : 'claude_api_key'
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        id: userId,
        [keyField]: apiKey,
        preferred_ai: provider,
        updated_at: new Date().toISOString(),
      })
    setSaving(false)
    if (error) {
      setFeedback({ type: 'error', msg: error.message })
    } else {
      setFeedback({ type: 'success', msg: 'API 키가 저장되었습니다.' })
    }
  }

  if (loadingSettings) {
    return (
      <div style={card}>
        <h2 style={sectionTitle}>AI API 키 설정</h2>
        <p style={{ fontSize: 13, color: '#6b7280' }}>불러오는 중...</p>
      </div>
    )
  }

  return (
    <>
    {showGuide && <ApiKeyGuideModal provider={provider} onClose={() => setShowGuide(false)} />}
    <div style={card}>
      <h2 style={sectionTitle}>AI API 키 설정</h2>

      {/* Provider toggle */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>사용할 AI</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {(['gemini', 'claude'] as Provider[]).map(p => (
            <label
              key={p}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 14,
                color: provider === p ? '#111' : '#888',
                fontWeight: provider === p ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="provider"
                value={p}
                checked={provider === p}
                onChange={() => void handleProviderChange(p)}
                style={{ accentColor: '#111' }}
              />
              {p === 'gemini' ? 'Gemini' : 'Claude'}
            </label>
          ))}
        </div>
      </div>

      {/* API key input */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            {provider === 'gemini' ? 'Gemini' : 'Claude'} API 키
          </label>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            style={{
              background: 'none', border: '1px solid #e0e0e0', borderRadius: 5,
              padding: '3px 10px', fontSize: 11, color: '#666', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span>?</span> 키 발급 방법
          </button>
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="API 키를 입력하세요"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = '#111')}
          onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: feedback.type === 'success' ? '#166534' : '#dc2626',
          }}
        >
          {feedback.msg}
        </div>
      )}

      <button
        onClick={() => void handleSave()}
        disabled={saving}
        style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
    </>
  )
}

// ─── Section 2: Subject Management ───────────────────────────────────────────
function SubjectsSection() {
  const { subjects, loading, error, addSubject, deleteSubject } = useSubjects()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [showSpectrum, setShowSpectrum] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) {
      setAddError('과목 이름을 입력하세요.')
      return
    }
    setAdding(true)
    setAddError(null)
    const { error: err } = await addSubject(newName.trim(), newColor)
    setAdding(false)
    if (err) {
      setAddError(err)
    } else {
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setShowAddForm(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 과목을 삭제하시겠습니까?`)) return
    setDeletingId(id)
    setDeleteError(null)
    const { error: err } = await deleteSubject(id)
    setDeletingId(null)
    if (err) {
      setDeleteError(err)
    }
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>과목 관리</h2>

      {loading && <p style={{ fontSize: 13, color: '#6b7280' }}>불러오는 중...</p>}
      {error && (
        <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>
      )}
      {deleteError && (
        <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{deleteError}</p>
      )}

      {/* Subject list */}
      {!loading && subjects.length === 0 && !showAddForm && (
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
          등록된 과목이 없습니다.
        </p>
      )}

      {subjects.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0 }}>
          {subjects.map(subject => (
            <li
              key={subject.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: subject.color,
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: 14, color: '#1f2937' }}>{subject.name}</span>
              </div>
              <button
                onClick={() => void handleDelete(subject.id, subject.name)}
                disabled={deletingId === subject.id}
                style={{
                  ...btnDanger,
                  opacity: deletingId === subject.id ? 0.5 : 1,
                  cursor: deletingId === subject.id ? 'not-allowed' : 'pointer',
                }}
                title="삭제"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      {showAddForm ? (
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '16px',
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>과목 이름</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="예: 수학, 영어, 과학"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
              onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>색상</label>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { setNewColor(color); setShowSpectrum(false) }}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: color,
                      border: newColor === color ? '3px solid #1f2937' : '3px solid transparent',
                      cursor: 'pointer', padding: 0, outline: 'none',
                      boxShadow: newColor === color ? '0 0 0 1px #fff inset' : 'none',
                      transition: 'border-color 0.1s, transform 0.1s',
                      transform: newColor === color ? 'scale(1.15)' : 'scale(1)',
                    }}
                    title={color}
                  />
                ))}

                {/* + spectrum button */}
                <button
                  type="button"
                  onClick={() => setShowSpectrum(s => !s)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: showSpectrum ? newColor : 'conic-gradient(hsl(0,75%,55%), hsl(60,75%,55%), hsl(120,75%,55%), hsl(180,75%,55%), hsl(240,75%,55%), hsl(300,75%,55%), hsl(360,75%,55%))',
                    border: showSpectrum ? '3px solid #1f2937' : '2px solid #d1d5db',
                    cursor: 'pointer', padding: 0, outline: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                    textShadow: '0 0 3px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                  }}
                  title="직접 색상 선택"
                >
                  {showSpectrum ? '' : '+'}
                </button>
              </div>

              {showSpectrum && (
                <SpectrumPicker
                  value={newColor}
                  onSelect={c => setNewColor(c)}
                  onClose={() => setShowSpectrum(false)}
                />
              )}
            </div>
          </div>

          {addError && (
            <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{addError}</p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void handleAdd()}
              disabled={adding}
              style={{ ...btnPrimary, opacity: adding ? 0.7 : 1, cursor: adding ? 'not-allowed' : 'pointer' }}
            >
              {adding ? '추가 중...' : '추가'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
                setNewColor(PRESET_COLORS[0])
                setAddError(null)
              }}
              style={btnOutline}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          style={btnOutline}
        >
          + 과목 추가
        </button>
      )}
    </div>
  )
}

// ─── Section 3: Feedback ─────────────────────────────────────────────────────
function FeedbackSection({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleSend = async () => {
    if (!message.trim()) {
      setFeedback({ type: 'error', msg: '내용을 입력해주세요.' })
      return
    }
    setSending(true)
    setFeedback(null)
    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      user_email: userEmail,
      message: message.trim(),
    })
    setSending(false)
    if (error) {
      setFeedback({ type: 'error', msg: '전송 실패: ' + error.message })
    } else {
      setFeedback({ type: 'success', msg: '피드백이 전송되었습니다. 감사합니다!' })
      setMessage('')
    }
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>문의 / 불편사항 제보</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
        불편한 점이나 개선 요청을 자유롭게 적어주세요.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>내용</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="예: 업로드 중 오류가 발생합니다. / 이런 기능이 있으면 좋겠어요."
          rows={4}
          style={{
            ...inputStyle,
            resize: 'vertical',
            lineHeight: 1.6,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#111')}
          onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
        />
      </div>

      {feedback && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: feedback.type === 'success' ? '#166534' : '#dc2626',
          }}
        >
          {feedback.msg}
        </div>
      )}

      <button
        onClick={() => void handleSend()}
        disabled={sending}
        style={{ ...btnPrimary, opacity: sending ? 0.7 : 1, cursor: sending ? 'not-allowed' : 'pointer' }}
      >
        {sending ? '전송 중...' : '전송'}
      </button>
    </div>
  )
}

// ─── Section 4: Patch Notes ───────────────────────────────────────────────────
function PatchNotesSection() {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? PATCH_NOTES : PATCH_NOTES.slice(0, 3)

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={sectionTitle}>업데이트 내역</h2>
        <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>v{APP_VERSION}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {visible.map((note, i) => (
          <div
            key={note.version}
            style={{
              paddingBottom: i < visible.length - 1 ? 18 : 0,
              marginBottom: i < visible.length - 1 ? 18 : 0,
              borderBottom: i < visible.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>
                v{note.version}
              </span>
              <span style={{ fontSize: 11, color: '#bbb' }}>{note.date}</span>
              {i === 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#111', padding: '1px 6px', borderRadius: 3, letterSpacing: 0.3 }}>
                  최신
                </span>
              )}
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {note.changes.map((change, j) => (
                <li key={j} style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {PATCH_NOTES.length > 3 && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          style={{ marginTop: 14, background: 'none', border: 'none', fontSize: 12, color: '#999', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
        >
          {expanded ? '접기' : `이전 버전 ${PATCH_NOTES.length - 3}개 더 보기`}
        </button>
      )}
    </div>
  )
}

// ─── Section 5: Account ───────────────────────────────────────────────────────
function AccountSection() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setLoggingOut(false)
      console.error('Logout failed:', error.message)
      return
    }
    navigate('/login', { replace: true })
  }

  return (
    <div style={card}>
      <h2 style={sectionTitle}>계정</h2>
      <button
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        style={{
          padding: '10px 20px',
          background: 'transparent',
          color: '#ef4444',
          border: '1px solid #ef4444',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: loggingOut ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          opacity: loggingOut ? 0.7 : 1,
        }}
      >
        {loggingOut ? '로그아웃 중...' : '로그아웃'}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div style={{ padding: '32px 16px', background: '#fff', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: -0.3 }}>설정</h1>
          <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>v{APP_VERSION}</span>
        </div>

        <ApiKeySection userId={user.id} />

        {/* Divider */}
        <div style={{ height: 1, background: '#f0f0f0', margin: '0 0 20px' }} />

        <SubjectsSection />

        {/* Divider */}
        <div style={{ height: 1, background: '#f0f0f0', margin: '0 0 20px' }} />

        <FeedbackSection userId={user.id} userEmail={user.email ?? ''} />

        {/* Divider */}
        <div style={{ height: 1, background: '#f0f0f0', margin: '0 0 20px' }} />

        <PatchNotesSection />

        {/* Divider */}
        <div style={{ height: 1, background: '#f0f0f0', margin: '0 0 20px' }} />

        <AccountSection />
      </div>
    </div>
  )
}
