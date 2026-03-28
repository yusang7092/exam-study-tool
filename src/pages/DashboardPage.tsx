import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import { useProblemSets } from '@/hooks/useProblemSets'
import { useApiKeyStatus } from '@/hooks/useApiKeyStatus'
import type { Attempt, ProblemSet, Subject } from '@/types/index'

const statusLabel = (status: ProblemSet['status']) => {
  if (status === 'ready') return { text: '학습 가능', color: '#16a34a', bg: '#f0fdf4' }
  if (status === 'extracting') return { text: '추출 중', color: '#d97706', bg: '#fffbeb' }
  if (status === 'reviewing') return { text: '검토 필요', color: '#2563eb', bg: '#eff6ff' }
  if (status === 'uploading') return { text: '업로드 중', color: '#7c3aed', bg: '#f5f3ff' }
  return { text: '실패', color: '#dc2626', bg: '#fef2f2' }
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

  // Per-subject stats: count problem sets, compute accuracy
  const subjectStats = useMemo(() => {
    return subjects.map(subject => {
      const subjectProblemSets = problemSets.filter(ps => ps.subject_id === subject.id)
      // We don't have subject_id on attempts directly — use problem_set_id mapping
      // attempts don't carry subject_id; per-subject accuracy would require problem join
      return {
        subject,
        psCount: subjectProblemSets.length,
      }
    })
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
        불러오는 중...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#111827', minHeight: '100%', background: '#f9fafb', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '24px 20px 20px' }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>오늘도 열심히!</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#111827' }}>
          안녕하세요, {username}님!
        </h1>
      </div>

      {/* API key warning banner */}
      {hasApiKey === false && (
        <div
          onClick={() => navigate('/settings')}
          style={{
            background: '#fffbeb', borderBottom: '1px solid #fcd34d',
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>AI API 키를 등록해주세요</span>
            <span style={{ fontSize: 13, color: '#b45309', marginLeft: 6 }}>문제 추출 기능을 사용하려면 필요해요</span>
          </div>
          <span style={{ fontSize: 13, color: '#b45309', fontWeight: 600 }}>등록하기 →</span>
        </div>
      )}

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{problemSets.length}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>문제집</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#6366f1' }}>{totalAttempts}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>풀이 수</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{overallAccuracy}%</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>정답률</div>
          </div>
        </div>

        {/* Subject grid */}
        {subjects.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>과목이 없습니다</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>설정에서 과목을 추가해보세요</div>
            <button
              onClick={() => navigate('/settings')}
              style={{
                padding: '10px 24px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              설정으로 이동
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>과목별 현황</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {subjectStats.map(({ subject, psCount }) => (
                <button
                  key={subject.id}
                  onClick={() => navigate(`/subject/${subject.id}`)}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 0,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    minHeight: 44,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Colored top border */}
                  <div style={{ height: 4, background: subject.color, width: '100%' }} />
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      {subject.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      문제집 {psCount}개
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent problem sets */}
        {recentProblemSets.length > 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12 }}>최근 문제집</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentProblemSets.map(ps => {
                const subject = subjectMap.get(ps.subject_id)
                const status = statusLabel(ps.status)
                return (
                  <div
                    key={ps.id}
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {/* Subject color dot */}
                    {subject && (
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: subject.color,
                        flexShrink: 0,
                      }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {ps.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                        {formatDate(ps.created_at)}
                      </div>
                    </div>

                    {/* Status chip */}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      color: status.color,
                      background: status.bg,
                      flexShrink: 0,
                    }}>
                      {status.text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/upload')}
        style={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#6366f1',
          color: '#fff',
          border: 'none',
          fontSize: 26,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
        aria-label="새 문제집 업로드"
      >
        +
      </button>

    </div>
  )
}
