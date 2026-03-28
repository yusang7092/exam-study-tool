const CIRCLES = ['①', '②', '③', '④', '⑤']

interface MCQInputProps {
  value: string
  onChange: (val: string) => void
  disabled: boolean
  options?: string[] | null
}

export default function MCQInput({ value, onChange, disabled, options }: MCQInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              gap: 12,
              padding: '12px 14px',
              border: `1.5px solid ${isSelected ? '#111' : '#e0e0e0'}`,
              borderRadius: 8,
              background: isSelected ? '#111' : '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && !isSelected ? 0.5 : 1,
              transition: 'all 0.15s ease',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <span style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 600,
              background: isSelected ? 'rgba(255,255,255,0.15)' : '#f5f5f5',
              color: isSelected ? '#fff' : '#555',
              transition: 'all 0.15s ease',
            }}>
              {circle}
            </span>
            {options && options[idx] && (
              <span style={{ fontSize: 14, color: isSelected ? '#fff' : '#333', fontWeight: isSelected ? 500 : 400, lineHeight: 1.4 }}>
                {options[idx]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
