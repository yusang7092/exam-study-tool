import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProblems } from '@/hooks/useProblems'
import { supabase } from '@/lib/supabase'
import ProblemCard from '@/components/extraction/ProblemCard'
import AddByImageModal from '@/components/extraction/AddByImageModal'
import type { ProblemSet } from '@/types/index'

export default function ExtractionReviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const setId = searchParams.get('setId')
  const note = searchParams.get('note')

  const [showAddByImage, setShowAddByImage] = useState(false)

  const [aiDebugRaw] = useState<string[] | null>(() => {
    try {
      const raw = localStorage.getItem('__ai_debug_raw')
      if (raw) { localStorage.removeItem('__ai_debug_raw'); return JSON.parse(raw) as string[] }
    } catch { /* ignore */ }
    return null
  })

  const [problemSet, setProblemSet] = useState<ProblemSet | null>(null)
  const [psLoading, setPsLoading] = useState(true)
  const [psError, setPsError] = useState<string | null>(null)
  const [startingSession, setStartingSession] = useState(false)

  const { problems, loading: problemsLoading, updateProblem, addProblem, deleteProblem, refetch } =
    useProblems(setId)

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
    if (problemSet?.status !== 'extracting') return
    const interval = setInterval(async () => {
      await fetchProblemSet()
      await refetch()
    }, 3000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemSet?.status, refetch])

  const handleStartLearning = async () => {
    if (!user || !problemSet) return
    setStartingSession(true)
    try {
      const { data: session, error } = await supabase
        .from('solve_sessions')
        .insert({
          user_id: user.id,
          subject_id: problemSet.subject_id,
          problem_set_id: problemSet.id,
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


  if (!setId) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
        <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 16 }}>문제 세트 ID가 없습니다. 업로드 페이지로 돌아가세요.</p>
        <button
          onClick={() => navigate('/upload')}
          style={{ padding: '9px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          업로드로 이동
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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 120px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#333' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 4, letterSpacing: -0.3 }}>
          {problemSet.title}
        </h1>
        <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
          {isExtracting ? 'AI 추출 중...' : `문제 ${problems.length}개`}
        </p>
      </div>

      {/* Extracting spinner */}
      {isExtracting && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: '2px solid #e8e8e8', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 13, color: '#999', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
            AI가 문제를 추출하고 있습니다<br />잠시만 기다려 주세요.
          </p>
        </div>
      )}

      {/* Problem cards */}
      {!isExtracting && (
        <>
          {problemsLoading ? (
            <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 40 }}>문제 불러오는 중...</div>
          ) : problems.length === 0 ? (
            <div style={{ padding: '32px 20px', background: '#fafafa', borderRadius: 8, border: '1px dashed #e0e0e0', fontSize: 13 }}>
              {note === 'no_problems' ? (
                <>
                  <p style={{ fontWeight: 600, color: '#333', marginBottom: 6, margin: '0 0 6px' }}>AI가 문제를 찾지 못했습니다</p>
                  <p style={{ color: '#888', lineHeight: 1.6, margin: '0 0 12px' }}>
                    이미지가 흐리거나 문제 형식이 달라 인식되지 않았을 수 있습니다.<br />아래에서 문제를 직접 추가해 주세요.
                  </p>
                  {aiDebugRaw && aiDebugRaw.length > 0 && (
                    <details style={{ textAlign: 'left', marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', color: '#999', fontSize: 11 }}>AI 응답 원문 (개발자용)</summary>
                      <pre style={{ marginTop: 8, padding: 10, background: '#f5f5f5', borderRadius: 5, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#555', maxHeight: 200, overflow: 'auto' }}>
                        {aiDebugRaw.join('\n---\n')}
                      </pre>
                    </details>
                  )}
                </>
              ) : (
                <p style={{ color: '#999', margin: 0 }}>추출된 문제가 없습니다. 아래 버튼으로 직접 추가할 수 있습니다.</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {problems.map(problem => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  onUpdate={async updates => {
                    const { error: updateErr } = await updateProblem(problem.id, updates)
                    if (updateErr) console.error('Failed to update problem:', updateErr)
                  }}
                  onDelete={() => void deleteProblem(problem.id)}
                  userId={user?.id}
                  problemSetId={setId ?? undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bottom action bar */}
      {!isExtracting && (
        <div style={{ position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom))', left: 0, right: 0, background: '#fff', borderTop: '1px solid #f0f0f0', padding: '10px 16px', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', zIndex: 101 }}>
          <button
            type="button"
            onClick={() => setShowAddByImage(true)}
            style={{ padding: '9px 16px', background: '#fff', color: '#333', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            문제 추가
          </button>
          <button
            type="button"
            onClick={() => void handleStartLearning()}
            disabled={startingSession || problems.length === 0}
            style={{
              padding: '9px 20px',
              background: startingSession || problems.length === 0 ? '#ccc' : '#111',
              color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
              cursor: startingSession || problems.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {startingSession ? '준비 중...' : '학습 시작'}
          </button>
        </div>
      )}
      {showAddByImage && problemSet && (
        <AddByImageModal
          onClose={() => setShowAddByImage(false)}
          onSave={async (data) => {
            await addProblem(setId!, problemSet.subject_id, data)
            void refetch()
          }}
        />
      )}
    </div>
  )
}
