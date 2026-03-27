const MCQ_OPTIONS = ['①', '②', '③', '④', '⑤']

interface Props {
  value: string | null
  onChange: (value: string) => void
}

export default function MCQAnswerInput({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, marginRight: 2 }}>
        정답:
      </span>
      {MCQ_OPTIONS.map(opt => {
        const selected = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: `2px solid ${selected ? '#6366F1' : '#D1D5DB'}`,
              background: selected ? '#6366F1' : 'white',
              color: selected ? 'white' : '#374151',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
              padding: 0,
            }}
            aria-label={`정답 ${opt}`}
            aria-pressed={selected}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
