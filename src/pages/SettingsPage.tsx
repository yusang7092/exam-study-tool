import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import { supabase } from '@/lib/supabase'

type Provider = 'gemini' | 'claude'

const PRESET_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6']

// ─── Shared style tokens ──────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  padding: '28px 32px',
  marginBottom: 24,
}

const sectionTitle: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: 16,
  fontWeight: 700,
  color: '#1f2937',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnDanger: React.CSSProperties = {
  padding: '6px 10px',
  background: 'transparent',
  color: '#ef4444',
  border: '1px solid #fca5a5',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnOutline: React.CSSProperties = {
  padding: '10px 20px',
  background: 'transparent',
  color: '#6366f1',
  border: '1px solid #6366f1',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

// ─── Section 1: API Key ───────────────────────────────────────────────────────
function ApiKeySection({ userId }: { userId: string }) {
  const [provider, setProvider] = useState<Provider>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

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
                color: provider === p ? '#6366f1' : '#374151',
                fontWeight: provider === p ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="provider"
                value={p}
                checked={provider === p}
                onChange={() => void handleProviderChange(p)}
                style={{ accentColor: '#6366f1' }}
              />
              {p === 'gemini' ? 'Gemini' : 'Claude'}
            </label>
          ))}
        </div>
      </div>

      {/* API key input */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>
          {provider === 'gemini' ? 'Gemini' : 'Claude'} API 키
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="API 키를 입력하세요"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
          onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
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
  )
}

// ─── Section 2: Subject Management ───────────────────────────────────────────
function SubjectsSection() {
  const { subjects, loading, error, addSubject, deleteSubject } = useSubjects()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
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
            <div style={{ display: 'flex', gap: 8 }}>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: color,
                    border: newColor === color ? '3px solid #1f2937' : '3px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    outline: 'none',
                    transition: 'border-color 0.1s',
                  }}
                  title={color}
                />
              ))}
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

// ─── Section 3: Account ───────────────────────────────────────────────────────
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
    <div style={{ padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 700, color: '#1f2937' }}>설정</h1>

        <ApiKeySection userId={user.id} />

        {/* Divider */}
        <div style={{ height: 1, background: '#e5e7eb', margin: '0 0 24px' }} />

        <SubjectsSection />

        {/* Divider */}
        <div style={{ height: 1, background: '#e5e7eb', margin: '0 0 24px' }} />

        <AccountSection />
      </div>
    </div>
  )
}
