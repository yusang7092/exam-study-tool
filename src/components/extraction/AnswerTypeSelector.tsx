import type { Problem } from '@/types/index'

interface Props {
  value: Problem['answer_type']
  onChange: (value: Problem['answer_type']) => void
}

const OPTIONS: { value: Problem['answer_type']; label: string }[] = [
  { value: 'mcq', label: '객관식' },
  { value: 'short', label: '단답형' },
  { value: 'essay', label: '서술형' },
]

export default function AnswerTypeSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {OPTIONS.map(opt => {
        const selected = value === opt.value
        return (
          <label
            key={opt.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 12px',
              borderRadius: 20,
              border: `1.5px solid ${selected ? '#6366F1' : '#D1D5DB'}`,
              background: selected ? '#EEF2FF' : 'white',
              color: selected ? '#4F46E5' : '#6B7280',
              fontSize: 13,
              fontWeight: selected ? 600 : 400,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="radio"
              name={`answer-type-${Math.random()}`}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              style={{ display: 'none' }}
            />
            {opt.label}
          </label>
        )
      })}
    </div>
  )
}
