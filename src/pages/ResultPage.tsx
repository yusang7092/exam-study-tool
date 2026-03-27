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
    if (!sessionId) {
      setError('세션 ID가 없습니다.')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('solve_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        setError('세션을 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      const sess = sessionData as SolveSession
      setSession(sess)

      // Fetch attempts
      const { data: attemptsData } = await supabase
        .from('attempts')
        .select('*')
        .eq('session_id', sessionId)

      setAttempts((attemptsData as Attempt[]) ?? [])

      // Fetch problems
      if (sess.problem_set_id) {
        const { data: problemsData } = await supabase
          .from('problems')
          .select('*')
          .eq('problem_set_id', sess.problem_set_id)
          .order('sequence_num', { ascending: true })

        setProblems((problemsData as Problem[]) ?? [])
      }

      // Fetch subject name
      if (sess.subject_id) {
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', sess.subject_id)
          .single()

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
    if (!user) {
      setCreatingNew(false)
      return
    }

    const { data: newSession, error: insertError } = await supabase
      .from('solve_sessions')
      .insert({
        user_id: user.id,
        subject_id: session.subject_id,
        problem_set_id: session.problem_set_id,
        mode: 'sequential',
        status: 'active',
      })
      .select()
      .single()

    if (insertError || !newSession) {
      setCreatingNew(false)
      return
    }

    navigate(`/solve/${newSession.id}`)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
        불러오는 중...
      </div>
    )
  }

  if (error || !session) {
    return (
      <div style={{ padding: 32, color: '#dc2626', fontFamily: 'system-ui, sans-serif' }}>
        {error ?? '세션을 찾을 수 없습니다.'}
      </div>
    )
  }

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
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#111827', overflowY: 'auto', height: '100%', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '24px 20px 16px', borderBottom: '1px solid #e5e7eb' }}>
        {subject && (
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{subject.name}</div>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#111827' }}>풀이 결과</h1>
      </div>

      {/* Stats */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>{total}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>전체</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#10b981' }}>{correct}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>정답</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#ef4444' }}>{wrong}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>오답</div>
          </div>
        </div>

        {/* Pie chart */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 16px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <PieChart width={200} height={200}>
              <Pie
                data={pieData}
                cx={100}
                cy={100}
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
            </PieChart>
            <div style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{accuracy}%</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>정답률</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
              <span style={{ fontSize: 13, color: '#374151' }}>정답 {correct}개</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} />
              <span style={{ fontSize: 13, color: '#374151' }}>오답 {wrong}개</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
          <button
            onClick={() => navigate('/review')}
            style={{
              width: '100%',
              padding: '16px',
              background: '#fff',
              color: '#6366f1',
              border: '2px solid #6366f1',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            오답 복습
          </button>
          <button
            onClick={handleNewSession}
            disabled={creatingNew}
            style={{
              width: '100%',
              padding: '16px',
              background: creatingNew ? '#9ca3af' : '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 600,
              cursor: creatingNew ? 'not-allowed' : 'pointer',
            }}
          >
            {creatingNew ? '생성 중...' : '다시 풀기'}
          </button>
        </div>
      </div>
    </div>
  )
}
