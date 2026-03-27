const CIRCLES = ['①', '②', '③', '④', '⑤']

interface MCQInputProps {
  value: string
  onChange: (val: string) => void
  disabled: boolean
  options?: string[] | null
}

export default function MCQInput({ value, onChange, disabled, options }: MCQInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {CIRCLES.map((circle, idx) => {
        const isSelected = value === circle
        return (
          <button
            key={circle}
            onClick={() => !disabled && onChange(circle)}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`,
              borderRadius: 12,
              background: isSelected ? '#eef2ff' : '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && !isSelected ? 0.6 : 1,
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                background: isSelected ? '#6366f1' : '#f3f4f6',
                color: isSelected ? '#fff' : '#374151',
                transition: 'all 0.15s ease',
              }}
            >
              {circle}
            </span>
            {options && options[idx] && (
              <span
                style={{
                  fontSize: 16,
                  color: isSelected ? '#4338ca' : '#374151',
                  fontWeight: isSelected ? 600 : 400,
                  lineHeight: 1.4,
                }}
              >
                {options[idx]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
