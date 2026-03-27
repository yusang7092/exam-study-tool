interface UploadProgressProps {
  step: 1 | 2 | 3
  error?: string
}

interface StepInfo {
  label: string
  icon: string
}

const STEPS: StepInfo[] = [
  { label: '파일 업로드 중...', icon: '☁️' },
  { label: 'AI 문제 추출 중...', icon: '🤖' },
  { label: '완료!', icon: '✅' },
]

export default function UploadProgress({ step, error }: UploadProgressProps) {
  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((s, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const isDone = step > stepNum
          const isActive = step === stepNum
          const isPending = step < stepNum

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {/* Left: circle + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isDone ? 16 : 18,
                    background: isDone
                      ? '#10B981'
                      : isActive
                      ? '#6366F1'
                      : '#F3F4F6',
                    color: isDone || isActive ? 'white' : '#9CA3AF',
                    border: isActive ? '2px solid #818CF8' : '2px solid transparent',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 0 4px #EEF2FF' : 'none',
                  }}
                >
                  {isDone ? '✓' : s.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      height: 32,
                      background: isDone ? '#10B981' : '#E5E7EB',
                      transition: 'background 0.3s',
                    }}
                  />
                )}
              </div>

              {/* Right: label */}
              <div
                style={{
                  paddingTop: 6,
                  paddingBottom: i < STEPS.length - 1 ? 32 : 0,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isDone
                      ? '#10B981'
                      : isActive
                      ? '#4F46E5'
                      : isPending
                      ? '#9CA3AF'
                      : '#1F2937',
                  }}
                >
                  {s.label}
                </span>
                {isActive && !error && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginLeft: 8,
                      fontSize: 12,
                      color: '#818CF8',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  >
                    처리 중
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div
          style={{
            marginTop: 20,
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            color: '#DC2626',
            fontSize: 13,
          }}
        >
          <strong>오류:</strong> {error}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
