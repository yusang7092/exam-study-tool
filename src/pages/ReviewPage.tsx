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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [sessionFilter, setSessionFilter] = useState<string | null>(sessionIdParam)

  useEffect(() => {
    if (!user) return

    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('attempts')
        .select('*, problems(*)')
        .eq('user_id', user.id)
        .eq('is_correct', false)
        .order('attempted_at', { ascending: false })

      setWrongAttempts((data as AttemptWithProblem[]) ?? [])
      setLoading(false)
    }

    void fetch()
  }, [user])

  // Subjects that actually have wrong answers
  const subjectsWithWrong = useMemo(() => {
    const subjectIds = new Set(wrongAttempts.map(a => a.problems?.subject_id).filter(Boolean))
    return subjects.filter(s => subjectIds.has(s.id))
  }, [wrongAttempts, subjects])

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.forEach(s => m.set(s.id, s))
    return m
  }, [subjects])

  const filtered = useMemo(() => {
    let list = wrongAttempts
    if (sessionFilter) {
      list = list.filter(a => a.session_id === sessionFilter)
    }
    if (selectedSubjectId) {
      list = list.filter(a => a.problems?.subject_id === selectedSubjectId)
    }
    return list
  }, [wrongAttempts, sessionFilter, selectedSubjectId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#111827', height: '100%', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>오답 복습</h1>
          <span style={{
            padding: '4px 12px',
            background: '#fef2f2',
            color: '#dc2626',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
          }}>
            {wrongAttempts.length}개 오답
          </span>
        </div>

        {/* Session filter chip */}
        {sessionFilter && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: '#ede9fe',
              color: '#6366f1',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
            }}>
              이번 세션 오답
              <button
                onClick={() => setSessionFilter(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: '0 0 0 2px',
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                ×
              </button>
            </span>
          </div>
        )}

        {/* Subject filter tabs */}
        <SubjectFilter
          subjects={subjectsWithWrong}
          selectedId={selectedSubjectId}
          onSelect={setSelectedSubjectId}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 80,
            color: '#6b7280',
            gap: 8,
          }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>오답이 없습니다</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>모든 문제를 완벽히 풀었어요!</div>
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
                subjectColor={subject?.color ?? '#6b7280'}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
