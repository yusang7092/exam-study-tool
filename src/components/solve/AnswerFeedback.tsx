interface AnswerFeedbackProps {
  isCorrect: boolean | null
  correctAnswer: string | null
  feedback: string | null
  onNext: () => void
  isLastProblem?: boolean
}

export default function AnswerFeedback({
  isCorrect,
  correctAnswer,
  feedback,
  onNext,
  isLastProblem = false,
}: AnswerFeedbackProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onNext}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '28px 24px 40px',
          width: '100%',
          maxWidth: 600,
          boxSizing: 'border-box',
        }}
      >
        {/* Result banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            padding: '16px 20px',
            borderRadius: 12,
            background: isCorrect === null ? '#f3f4f6' : isCorrect ? '#dcfce7' : '#fee2e2',
          }}
        >
          <span style={{ fontSize: 32 }}>
            {isCorrect === null ? '⏳' : isCorrect ? '✅' : '❌'}
          </span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: isCorrect === null ? '#374151' : isCorrect ? '#15803d' : '#dc2626',
            }}
          >
            {isCorrect === null ? '채점 중...' : isCorrect ? '정답!' : '오답'}
          </span>
        </div>

        {/* Correct answer */}
        {correctAnswer && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>정답</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{correctAnswer}</p>
          </div>
        )}

        {/* AI feedback */}
        {feedback && (
          <div
            style={{
              background: '#f9fafb',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 20,
            }}
          >
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>피드백</p>
            <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, margin: 0 }}>{feedback}</p>
          </div>
        )}

        {/* Next button */}
        {isCorrect !== null && (
          <button
            onClick={onNext}
            style={{
              width: '100%',
              padding: '16px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isLastProblem ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </div>
  )
}
