import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'signin' | 'signup'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#111',
  transition: 'border-color 0.15s',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp, user } = useAuth()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) { setError(error.message); setLoading(false) }
    } else {
      const { error } = await signUp(email, password)
      if (error) { setError(error.message); setLoading(false) }
      else { setSignupDone(true); setLoading(false) }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo area */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-block', width: 32, height: 32, background: '#111', borderRadius: 6, marginBottom: 16 }} />
          <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: -0.3 }}>
            시험 학습 도구
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#999' }}>
            {mode === 'signin' ? '계속하려면 로그인하세요' : '새 계정을 만드세요'}
          </p>
        </div>

        {signupDone ? (
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#111' }}>가입 완료</p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>이메일을 확인한 후 로그인하세요.</p>
            <button
              onClick={() => { setMode('signin'); setSignupDone(false) }}
              style={{
                background: '#111', color: '#fff', border: 'none',
                borderRadius: 6, padding: '9px 16px', fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              로그인으로 이동
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 6, letterSpacing: 0.2 }}>
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = '#111')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 6, letterSpacing: 0.2 }}>
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = '#111')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
              />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 14, padding: '9px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? '#555' : '#111',
                color: '#fff', border: 'none', borderRadius: 6,
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginBottom: 10, letterSpacing: 0.2,
                transition: 'background 0.15s',
              }}
            >
              {loading ? '처리 중...' : mode === 'signin' ? '로그인' : '회원가입'}
            </button>

            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent', color: '#666',
                border: '1px solid #e0e0e0', borderRadius: 6,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {mode === 'signin' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
