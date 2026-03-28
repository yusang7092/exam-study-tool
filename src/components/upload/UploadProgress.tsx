interface UploadProgressProps {
  step: 1 | 2 | 3
  error?: string
  progressText?: string
  step1Percent?: number
  extractPercent?: number
  estimatedSecsLeft?: number
}

interface StepInfo {
  label: string
}

const STEPS: StepInfo[] = [
  { label: '파일 업로드' },
  { label: 'AI 문제 추출' },
  { label: '완료' },
]

function formatTime(secs: number): string {
  if (secs < 60) return `약 ${Math.ceil(secs)}초 남음`
  const m = Math.floor(secs / 60)
  const s = Math.ceil(secs % 60)
  return s > 0 ? `약 ${m}분 ${s}초 남음` : `약 ${m}분 남음`
}

export default function UploadProgress({ step, error, progressText, step1Percent, extractPercent, estimatedSecsLeft }: UploadProgressProps) {
  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((s, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const isDone = step > stepNum
          const isActive = step === stepNum
          const isPending = step < stepNum

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Left: dot + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  background: isDone ? '#111' : isActive ? '#111' : '#f0f0f0',
                  color: isDone || isActive ? '#fff' : '#bbb',
                  border: isActive ? '2px solid #111' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  {isDone ? '✓' : stepNum}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 1, height: 28, background: isDone ? '#111' : '#e8e8e8', transition: 'background 0.3s' }} />
                )}
              </div>

              {/* Right: label */}
              <div style={{ paddingTop: 5, paddingBottom: i < STEPS.length - 1 ? 28 : 0, flex: 1 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isDone ? '#111' : isActive ? '#111' : isPending ? '#bbb' : '#111',
                }}>
                  {s.label}
                </span>
                {isActive && !error && (
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#888' }}>
                    {stepNum === 2 && progressText ? progressText : '처리 중...'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {step === 1 && !error && step1Percent !== undefined && (
        <div style={{ marginTop: 16 }}>
          <div style={{ height: 3, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${step1Percent}%`, background: '#111', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ marginTop: 5, fontSize: 11, color: '#999' }}>{step1Percent}%</div>
        </div>
      )}

      {step === 2 && !error && extractPercent !== undefined && (
        <div style={{ marginTop: 16 }}>
          <div style={{ height: 3, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${extractPercent}%`, background: '#111', borderRadius: 99, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#999' }}>
            <span>{extractPercent}%</span>
            <span>{estimatedSecsLeft === undefined || estimatedSecsLeft <= 0 ? '계산 중...' : formatTime(estimatedSecsLeft)}</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: '11px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13 }}>
          <strong>오류:</strong> {error}
        </div>
      )}
    </div>
  )
}
