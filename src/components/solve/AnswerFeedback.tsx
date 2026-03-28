interface AnswerFeedbackProps {
  isCorrect: boolean | null
  correctAnswer: string | null
  feedback: string | null
  onNext: () => void
  isLastProblem?: boolean
}

export default function AnswerFeedback({ isCorrect, correctAnswer, feedback, onNext, isLastProblem = false }: AnswerFeedbackProps) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}
      onClick={onNext}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '12px 12px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 600, boxSizing: 'border-box' }}
      >
        {/* Result */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
          padding: '14px 16px',
          borderRadius: 8,
          background: isCorrect === null ? '#f5f5f5' : isCorrect ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isCorrect === null ? '#e8e8e8' : isCorrect ? '#bbf7d0' : '#fecaca'}`,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: isCorrect === null ? '#ccc' : isCorrect ? '#16a34a' : '#dc2626',
          }} />
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: isCorrect === null ? '#666' : isCorrect ? '#15803d' : '#dc2626',
          }}>
            {isCorrect === null ? '채점 중...' : isCorrect ? '정답' : '오답'}
          </span>
        </div>

        {/* Correct answer */}
        {correctAnswer && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: '#999', marginBottom: 4, letterSpacing: 0.3, textTransform: 'uppercase' }}>정답</p>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#111', margin: 0 }}>{correctAnswer}</p>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 7, padding: '11px 14px', marginBottom: 18 }}>
            <p style={{ fontSize: 11, color: '#999', marginBottom: 4, letterSpacing: 0.3, textTransform: 'uppercase' }}>피드백</p>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: 0 }}>{feedback}</p>
          </div>
        )}

        {isCorrect !== null && (
          <button
            onClick={onNext}
            style={{ width: '100%', padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.2 }}
          >
            {isLastProblem ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  )
}
