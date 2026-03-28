import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import { useProblemSets } from '@/hooks/useProblemSets'
import { useApiKeyStatus } from '@/hooks/useApiKeyStatus'
import type { Attempt, ProblemSet, Subject } from '@/types/index'

const statusLabel = (status: ProblemSet['status']) => {
  if (status === 'ready') return { text: '학습 가능', color: '#16a34a' }
  if (status === 'extracting') return { text: '추출 중', color: '#b45309' }
  if (status === 'reviewing') return { text: '검토 필요', color: '#2563eb' }
  if (status === 'uploading') return { text: '업로드 중', color: '#6b7280' }
  return { text: '실패', color: '#dc2626' }
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subjects, loading: subjectsLoading } = useSubjects()
  const { problemSets, loading: psLoading } = useProblemSets()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      setAttemptsLoading(true)
      const { data } = await supabase
        .from('attempts')
        .select('id, is_correct, problem_id, session_id, user_id, user_answer, ai_feedback, time_spent_sec, attempted_at')
        .eq('user_id', user.id)
      setAttempts((data as Attempt[]) ?? [])
      setAttemptsLoading(false)
    }
    void fetch()
  }, [user])

  const loading = subjectsLoading || psLoading || attemptsLoading
  const hasApiKey = useApiKeyStatus()
  const username = user?.email?.split('@')[0] ?? '학생'

  const totalAttempts = attempts.length
  const totalCorrect = attempts.filter(a => a.is_correct === true).length
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  const subjectStats = useMemo(() => {
    return subjects.map(subject => ({
      subject,
      psCount: problemSets.filter(ps => ps.subject_id === subject.id).length,
    }))
  }, [subjects, problemSets])

  const recentProblemSets = useMemo(() => {
    return [...problemSets]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [problemSets])

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>()
    subjects.forEach(s => m.set(s.id, s))
    return m
  }, [subjects])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111', minHeight: '100%', background: '#fff', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div style={{ padding: '32px 20px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#999', letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: -0.3 }}>
          {username}
        </h1>
      </div>

      {/* API key warning */}
      {hasApiKey === false && (
        <div
          onClick={() => navigate('/settings')}
          style={{
            background: '#fafafa',
            borderBottom: '1px solid #e8e8e8',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 13, color: '#111' }}>AI API 키를 등록해주세요</span>
          <span style={{ fontSize: 13, color: '#999' }}>설정 →</span>
        </div>
      )}

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { value: problemSets.length, label: '문제집' },
            { value: totalAttempts, label: '풀이 수' },
            { value: `${overallAccuracy}%`, label: '정답률' },
          ].map((stat, i) => (
            <div key={i} style={{ padding: '16px 12px', textAlign: 'center', background: '#fff', borderRight: i < 2 ? '1px solid #e8e8e8' : 'none' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: -0.5 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 3, letterSpacing: 0.2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Subjects */}
        {subjects.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#999', marginBottom: 16 }}>등록된 과목이 없습니다</div>
            <button
              onClick={() => navigate('/settings')}
              style={{
                padding: '9px 20px',
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                letterSpacing: 0.2,
              }}
            >
              과목 추가
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: '#999', margin: '0 0 12px', letterSpacing: 0.8, textTransform: 'uppercase' }}>과목</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {subjectStats.map(({ subject, psCount }) => (
                <button
                  key={subject.id}
                  onClick={() => navigate(`/subject/${subject.id}`)}
                  style={{
                    background: '#fff',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subject.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      {psCount}개
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        {recentProblemSets.length > 0 && (
          <div>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: '#999', margin: '0 0 12px', letterSpacing: 0.8, textTransform: 'uppercase' }}>최근 문제집</h2>
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
              {recentProblemSets.map((ps, i) => {
                const subject = subjectMap.get(ps.subject_id)
                const status = statusLabel(ps.status)
                return (
                  <div
                    key={ps.id}
                    style={{
                      padding: '13px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
                      background: '#fff',
                    }}
                  >
                    {subject && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ps.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                        {formatDate(ps.created_at)}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: status.color, flexShrink: 0, fontWeight: 500 }}>
                      {status.text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload FAB */}
      <button
        onClick={() => navigate('/upload')}
        style={{
          position: 'fixed',
          bottom: 'calc(68px + env(safe-area-inset-bottom))',
          right: 20,
          width: 48,
          height: 48,
          borderRadius: 8,
          background: '#111',
          color: '#fff',
          border: 'none',
          fontSize: 22,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          fontWeight: 300,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        aria-label="새 문제집 업로드"
      >
        +
      </button>
    </div>
  )
}
