import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import SubjectFilter from '@/components/review/SubjectFilter'
import WrongAnswerCard from '@/components/review/WrongAnswerCard'
import type { Problem, Attempt, Subject } from '@/types/index'

interface AttemptWithProblem extends Attempt {
  problems: Problem
}

export default function ReviewPage() {
  const { user } = useAuth()
  const { subjects } = useSubjects()
  const [searchParams] = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')

  const [wrongAttempts, setWrongAttempts] = useState<AttemptWithProblem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [sessionFilter, setSessionFilter] = useState<string | null>(sessionIdParam)

  useEffect(() => { setSessionFilter(sessionIdParam) }, [sessionIdParam])

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('attempts')
        .select('*, problems(*)')
        .eq('user_id', user.id)
        .eq('is_correct', false)
        .order('attempted_at', { ascending: false })
      if (error) { setFetchError('오답을 불러오지 못했습니다.'); setLoading(false); return }
      setWrongAttempts((data as AttemptWithProblem[]) ?? [])
      setLoading(false)
    }
    void fetch()
  }, [user])

  const subjectsWithWrong = useMemo(() => {
    const ids = new Set(wrongAttempts.map(a => a.problems?.subject_id).filter(Boolean))
    return subjects.filter(s => ids.has(s.id))
  }, [wrongAttempts, subjects])

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.forEach(s => m.set(s.id, s))
    return m
  }, [subjects])

  const filtered = useMemo(() => {
    let list = wrongAttempts
    if (sessionFilter) list = list.filter(a => a.session_id === sessionFilter)
    if (selectedSubjectId) list = list.filter(a => a.problems?.subject_id === selectedSubjectId)
    return list
  }, [wrongAttempts, sessionFilter, selectedSubjectId])

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>불러오는 중...</div>
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <div style={{ padding: '24px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111', letterSpacing: -0.3 }}>오답 복습</h1>
          <span style={{ fontSize: 12, color: '#999' }}>{wrongAttempts.length}개</span>
        </div>

        {sessionFilter && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#f5f5f5', color: '#555', borderRadius: 5, fontSize: 12, border: '1px solid #e8e8e8' }}>
              이번 세션 오답
              <button onClick={() => setSessionFilter(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 0 0 2px', fontFamily: 'inherit' }}>×</button>
            </span>
          </div>
        )}

        <SubjectFilter subjects={subjectsWithWrong} selectedId={selectedSubjectId} onSelect={setSelectedSubjectId} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 32px' }}>
        {fetchError && <div style={{ color: '#dc2626', padding: '12px 0', fontSize: 13 }}>{fetchError}</div>}
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, color: '#999', gap: 6 }}>
            <div style={{ fontSize: 14, color: '#666' }}>오답이 없습니다</div>
            <div style={{ fontSize: 13, color: '#bbb' }}>모든 문제를 맞혔습니다</div>
          </div>
        ) : (
          filtered.map(attempt => {
            const problem = attempt.problems
            if (!problem) return null
            const subject = subjectMap.get(problem.subject_id)
            return (
              <WrongAnswerCard
                key={attempt.id}
                problem={problem}
                attempt={attempt}
                subjectName={subject?.name ?? '과목 없음'}
                subjectColor={subject?.color ?? '#888'}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
