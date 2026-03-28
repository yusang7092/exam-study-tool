import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSolveSession } from '@/hooks/useSolveSession'
import { useAttempts } from '@/hooks/useAttempts'
import { checkMCQ, checkShortAnswer } from '@/lib/answerChecker'
import ProgressBar from '@/components/solve/ProgressBar'
import ProblemDisplay from '@/components/solve/ProblemDisplay'
import MCQInput from '@/components/solve/MCQInput'
import ShortAnswerInput from '@/components/solve/ShortAnswerInput'
import EssayInput from '@/components/solve/EssayInput'
import AnswerFeedback from '@/components/solve/AnswerFeedback'

export default function SolvePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session: authSession } = useAuth()

  const [answer, setAnswer] = useState('')
  const [essayPhoto, setEssayPhoto] = useState<Blob | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null)
  const [feedbackText, setFeedbackText] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const startTimeRef = useRef<number>(Date.now())

  const handleSessionComplete = useCallback(() => {
    navigate(`/result/${sessionId}`)
  }, [navigate, sessionId])

  const {
    session,
    problems,
    currentProblem,
    currentIndex,
    totalProblems,
    completedCount,
    loading,
    error,
    canGoNext,
    nextProblem,
    refetchAttempts,
    isComplete,
    attempts,
  } = useSolveSession(sessionId, handleSessionComplete)

  const { submitAttempt } = useAttempts()

  // Navigate to result if already complete
  useEffect(() => {
    if (isComplete && sessionId) {
      navigate(`/result/${sessionId}`)
    }
  }, [isComplete, sessionId, navigate])

  // Reset state when problem changes
  useEffect(() => {
    if (!currentProblem) return
    const existing = attempts.find(a => a.problem_id === currentProblem.id)
    if (existing) {
      setSubmitted(true)
      setFeedbackCorrect(existing.is_correct)
      setFeedbackText(existing.ai_feedback)
    } else {
      setSubmitted(false)
      setFeedbackCorrect(null)
      setFeedbackText(null)
    }
    setAnswer('')
    setEssayPhoto(null)
    setFeedbackVisible(false)
    startTimeRef.current = Date.now()
  }, [currentProblem?.id, attempts])

  const handleSubmit = async () => {
    if (!currentProblem || !sessionId || submitting) return
    if (!answer.trim() && !essayPhoto) return

    setSubmitting(true)
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)

    let isCorrect: boolean | null = null
    let aiFeedback: string | null = null
    const userAnswerText = answer.trim() || (essayPhoto ? '[사진 답안]' : '')

    if (currentProblem.answer_type === 'mcq') {
      isCorrect = checkMCQ(answer, currentProblem.correct_answer ?? '')
    } else if (currentProblem.answer_type === 'short') {
      isCorrect = checkShortAnswer(answer, currentProblem.correct_answer ?? '')
    }

    const attempt = await submitAttempt({
      session_id: sessionId,
      problem_id: currentProblem.id,
      user_answer: userAnswerText,
      is_correct: isCorrect,
      ai_feedback: aiFeedback,
      time_spent_sec: timeSpent,
    })

    if (currentProblem.answer_type === 'essay' && attempt) {
      setFeedbackCorrect(null)
      setFeedbackVisible(true)
      setSubmitted(true)

      try {
        const token = authSession?.access_token
        if (!authSession) {
          setSubmitting(false)
          return
        }

        let finalAnswer = answer.trim()
        let essayImagePath: string | undefined
        if (essayPhoto && authSession?.user) {
          const path = `${authSession.user.id}/essays/${attempt.id}.jpg`
          await supabase.storage.from('page-images').upload(path, essayPhoto, { upsert: true })
          finalAnswer = finalAnswer || '[사진 답안]'
          essayImagePath = path
        }

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-essay-answer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              attempt_id: attempt.id,
              problem_id: currentProblem.id,
              user_answer: finalAnswer,
              ...(essayImagePath ? { essay_image_path: essayImagePath } : {}),
            }),
          }
        )

        if (res.ok) {
          const data = await res.json()
          setFeedbackCorrect(data.is_correct as boolean)
          setFeedbackText(data.feedback as string)
        } else {
          setFeedbackCorrect(false)
          setFeedbackText('채점에 실패했습니다.')
        }
      } catch {
        setFeedbackCorrect(false)
        setFeedbackText('채점 중 오류가 발생했습니다.')
      }
    } else {
      setFeedbackCorrect(isCorrect)
      setFeedbackText(null)
      setFeedbackVisible(true)
      setSubmitted(true)
    }

    await refetchAttempts()
    setSubmitting(false)
  }

  const handleFeedbackNext = () => {
    setFeedbackVisible(false)
    if (!canGoNext) {
      navigate(`/result/${sessionId}`)
    } else {
      nextProblem()
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
        불러오는 중...
      </div>
    )
  }

  if (error || !session) {
    return (
      <div style={{ padding: 32, color: '#dc2626' }}>
        {error ?? '세션을 찾을 수 없습니다.'}
      </div>
    )
  }

  if (!currentProblem || problems.length === 0) {
    return (
      <div style={{ padding: 32, color: '#374151' }}>
        문제가 없습니다.
      </div>
    )
  }

  const alreadyAttempted = attempts.some(a => a.problem_id === currentProblem.id)
  const isLastProblem = !canGoNext

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <ProgressBar current={completedCount} total={totalProblems} />

      <div style={{ padding: '12px 16px 0', color: '#6b7280', fontSize: 13 }}>
        문제 {currentIndex + 1}
      </div>

      <ProblemDisplay problem={currentProblem} />

      <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
        {currentProblem.answer_type === 'mcq' && (
          <MCQInput
            value={answer}
            onChange={setAnswer}
            disabled={alreadyAttempted || submitting}
            options={currentProblem.options}
          />
        )}
        {currentProblem.answer_type === 'short' && (
          <ShortAnswerInput
            value={answer}
            onChange={setAnswer}
            disabled={alreadyAttempted || submitting}
            onSubmit={handleSubmit}
          />
        )}
        {currentProblem.answer_type === 'essay' && (
          <EssayInput
            value={answer}
            onTextChange={setAnswer}
            onPhotoCapture={blob => setEssayPhoto(blob)}
            disabled={alreadyAttempted || submitting}
          />
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {!alreadyAttempted ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || (!answer.trim() && !essayPhoto)}
              style={{
                flex: 1,
                padding: '14px',
                background: submitting || (!answer.trim() && !essayPhoto) ? '#9ca3af' : '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 600,
                cursor: submitting || (!answer.trim() && !essayPhoto) ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '채점 중...' : '제출'}
            </button>
          ) : (
            <>
              {!isLastProblem && (
                <button
                  onClick={() => nextProblem()}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 17,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  다음 문제
                </button>
              )}
              {isLastProblem && (
                <button
                  onClick={() => navigate(`/result/${sessionId}`)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#059669',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 17,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  결과 보기
                </button>
              )}
            </>
          )}
        </div>

        {!submitted && canGoNext && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
            <button
              onClick={() => nextProblem()}
              style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}
            >
              건너뛰기
            </button>
          </div>
        )}
      </div>

      {feedbackVisible && (
        <AnswerFeedback
          isCorrect={feedbackCorrect}
          correctAnswer={currentProblem.correct_answer}
          feedback={feedbackText}
          onNext={handleFeedbackNext}
          isLastProblem={isLastProblem}
        />
      )}
    </div>
  )
}
