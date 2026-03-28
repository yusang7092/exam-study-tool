import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell } from 'recharts'
import { supabase } from '@/lib/supabase'
import type { SolveSession, Attempt, Problem, Subject } from '@/types/index'

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<SolveSession | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)

  useEffect(() => {
    if (!sessionId) { setError('세션 ID가 없습니다.'); setLoading(false); return }
    const load = async () => {
      setLoading(true); setError(null)
      const { data: sessionData, error: sessionError } = await supabase.from('solve_sessions').select('*').eq('id', sessionId).single()
      if (sessionError || !sessionData) { setError('세션을 찾을 수 없습니다.'); setLoading(false); return }
      const sess = sessionData as SolveSession
      setSession(sess)
      const { data: attemptsData } = await supabase.from('attempts').select('*').eq('session_id', sessionId)
      setAttempts((attemptsData as Attempt[]) ?? [])
      if (sess.problem_set_id) {
        const { data: problemsData } = await supabase.from('problems').select('*').eq('problem_set_id', sess.problem_set_id).order('sequence_num', { ascending: true })
        setProblems((problemsData as Problem[]) ?? [])
      }
      if (sess.subject_id) {
        const { data: subjectData } = await supabase.from('subjects').select('*').eq('id', sess.subject_id).single()
        if (subjectData) setSubject(subjectData as Subject)
      }
      setLoading(false)
    }
    void load()
  }, [sessionId])

  const handleNewSession = async () => {
    if (!session?.subject_id || !session?.problem_set_id || creatingNew) return
    setCreatingNew(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreatingNew(false); return }
    const { data: newSession, error: insertError } = await supabase
      .from('solve_sessions')
      .insert({ user_id: user.id, subject_id: session.subject_id, problem_set_id: session.problem_set_id, mode: 'sequential', status: 'active' })
      .select().single()
    if (insertError || !newSession) { setCreatingNew(false); return }
    navigate(`/solve/${newSession.id}`)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>불러오는 중...</div>
  if (error || !session) return <div style={{ padding: 32, color: '#dc2626', fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>{error ?? '세션을 찾을 수 없습니다.'}</div>

  const total = problems.length
  const correct = attempts.filter(a => a.is_correct === true).length
  const wrong = attempts.filter(a => a.is_correct === false).length
  const unanswered = total - attempts.length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const pieData = [
    { name: '정답', value: correct || 0 },
    { name: '오답', value: wrong + unanswered || 0 },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111', overflowY: 'auto', height: '100%', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '28px 20px 18px', borderBottom: '1px solid #f0f0f0' }}>
        {subject && <div style={{ fontSize: 12, color: '#999', marginBottom: 4, letterSpacing: 0.3 }}>{subject.name}</div>}
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111', letterSpacing: -0.3 }}>풀이 결과</h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { value: total, label: '전체', color: '#111' },
            { value: correct, label: '정답', color: '#16a34a' },
            { value: wrong, label: '오답', color: '#dc2626' },
          ].map((stat, i) => (
            <div key={i} style={{ padding: '16px 10px', textAlign: 'center', background: '#fff', borderRight: i < 2 ? '1px solid #e8e8e8' : 'none' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color, letterSpacing: -0.5 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pie chart */}
        <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <PieChart width={180} height={180}>
              <Pie data={pieData} cx={90} cy={90} innerRadius={52} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                <Cell fill="#111111" />
                <Cell fill="#e8e8e8" />
              </Pie>
            </PieChart>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#111', letterSpacing: -1 }}>{accuracy}%</span>
              <span style={{ fontSize: 11, color: '#999' }}>정답률</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#111' }} />
              <span style={{ fontSize: 12, color: '#555' }}>정답 {correct}개</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#e0e0e0' }} />
              <span style={{ fontSize: 12, color: '#555' }}>오답 {wrong}개</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => navigate(`/review?sessionId=${sessionId}`)}
            style={{ width: '100%', padding: '14px', background: '#fff', color: '#111', border: '1px solid #e0e0e0', borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            오답 복습
          </button>
          <button
            onClick={handleNewSession}
            disabled={creatingNew}
            style={{ width: '100%', padding: '14px', background: creatingNew ? '#555' : '#111', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: creatingNew ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            {creatingNew ? '생성 중...' : '다시 풀기'}
          </button>
        </div>
      </div>
    </div>
  )
}
