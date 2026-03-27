import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProblems } from '@/hooks/useProblems'
import { supabase } from '@/lib/supabase'
import ProblemCard from '@/components/extraction/ProblemCard'
import type { ProblemSet } from '@/types/index'

export default function ExtractionReviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const setId = searchParams.get('setId')

  const [problemSet, setProblemSet] = useState<ProblemSet | null>(null)
  const [psLoading, setPsLoading] = useState(true)
  const [psError, setPsError] = useState<string | null>(null)
  const [startingSession, setStartingSession] = useState(false)

  const { problems, loading: problemsLoading, updateProblem, addProblem, deleteProblem, refetch } =
    useProblems(setId)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch problem_set
  const fetchProblemSet = async () => {
    if (!setId || !user) {
      setPsLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('problem_sets')
      .select('*')
      .eq('id', setId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      setPsError(error.message)
    } else {
      setProblemSet(data as ProblemSet)
    }
    setPsLoading(false)
  }

  useEffect(() => {
    void fetchProblemSet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, user])

  // Poll while status is 'extracting'
  useEffect(() => {
    if (problemSet?.status === 'extracting') {
      pollingRef.current = setInterval(async () => {
        if (!setId || !user) return
        const { data } = await supabase
          .from('problem_sets')
          .select('*')
          .eq('id', setId)
          .eq('user_id', user.id)
          .single()
        if (data) {
          const ps = data as ProblemSet
          setProblemSet(ps)
          if (ps.status !== 'extracting') {
            if (pollingRef.current) clearInterval(pollingRef.current)
            if (ps.status === 'reviewing') void refetch()
          }
        }
      }, 3000)
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [problemSet?.status, setId, user, refetch])

  const handleStartLearning = async () => {
    if (!user || !problemSet) return
    setStartingSession(true)
    try {
      const { data: session, error } = await supabase
        .from('solve_sessions')
        .insert({
          user_id: user.id,
          subject_id: problemSet.subject_id,
          mode: 'sequential',
          status: 'active',
        })
        .select()
        .single()

      if (error || !session) {
        console.error('Failed to create solve session:', error)
        setStartingSession(false)
        return
      }
      navigate(`/solve/${session.id}`)
    } catch (err) {
      console.error(err)
      setStartingSession(false)
    }
  }

  const handleAddProblem = async () => {
    if (!setId || !problemSet) return
    await addProblem(setId, problemSet.subject_id)
  }

  if (!setId) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', color: '#374151' }}>
        <p style={{ color: '#EF4444' }}>문제 세트 ID가 없습니다. 업로드 페이지로 돌아가세요.</p>
        <button
          onClick={() => navigate('/upload')}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            background: '#6366F1',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          업로드 페이지로
        </button>
      </div>
    )
  }

  if (psLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          fontFamily: 'system-ui, sans-serif',
          color: '#6B7280',
        }}
      >
        불러오는 중...
      </div>
    )
  }

  if (psError || !problemSet) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', color: '#374151' }}>
        <p style={{ color: '#EF4444' }}>문제 세트를 불러올 수 없습니다: {psError}</p>
      </div>
    )
  }

  const isExtracting = problemSet.status === 'extracting'

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '24px 20px 120px',
        fontFamily: 'system-ui, sans-serif',
        color: '#374151',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1F2937',
            marginBottom: 4,
          }}
        >
          {problemSet.title}
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280' }}>
          {isExtracting
            ? 'AI가 문제를 추출하고 있습니다...'
            : `문제 ${problems.length}개`}
        </p>
      </div>

      {/* Extracting spinner */}
      {isExtracting && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid #E5E7EB',
              borderTopColor: '#6366F1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
            AI가 문제를 추출하고 있습니다...
            <br />
            <span style={{ fontSize: 13 }}>잠시만 기다려 주세요.</span>
          </p>
        </div>
      )}

      {/* Problem cards */}
      {!isExtracting && (
        <>
          {problemsLoading ? (
            <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 40 }}>
              문제 불러오는 중...
            </div>
          ) : problems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: '#F9FAFB',
                borderRadius: 12,
                border: '1.5px dashed #D1D5DB',
                color: '#9CA3AF',
                fontSize: 14,
              }}
            >
              <p style={{ marginBottom: 8 }}>추출된 문제가 없습니다.</p>
              <p>아래 버튼으로 문제를 직접 추가할 수 있습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {problems.map(problem => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  onUpdate={updates => void updateProblem(problem.id, updates)}
                  onDelete={() => void deleteProblem(problem.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bottom action bar */}
      {!isExtracting && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '1px solid #E5E7EB',
            padding: '12px 20px',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            alignItems: 'center',
            zIndex: 100,
          }}
        >
          {/* Add problem button */}
          <button
            type="button"
            onClick={() => void handleAddProblem()}
            style={{
              padding: '10px 18px',
              background: 'white',
              color: '#6366F1',
              border: '1.5px solid #6366F1',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            문제 추가
          </button>

          {/* Start learning button */}
          <button
            type="button"
            onClick={() => void handleStartLearning()}
            disabled={startingSession || problems.length === 0}
            style={{
              padding: '10px 22px',
              background:
                startingSession || problems.length === 0 ? '#E5E7EB' : '#6366F1',
              color:
                startingSession || problems.length === 0 ? '#9CA3AF' : 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor:
                startingSession || problems.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {startingSession ? '준비 중...' : '학습 시작'}
          </button>
        </div>
      )}
    </div>
  )
}
