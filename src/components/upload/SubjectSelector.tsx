import type { Subject } from '@/types/index'

interface SubjectSelectorProps {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function SubjectSelector({ subjects, selectedId, onSelect }: SubjectSelectorProps) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value === '' ? null : e.target.value)}
        style={{
          width: '100%',
          padding: '10px 36px 10px 40px',
          fontSize: 14,
          border: '1.5px solid #D1D5DB',
          borderRadius: 8,
          background: 'white',
          color: selectedId ? '#1F2937' : '#9CA3AF',
          appearance: 'none',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="">과목 없음</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Color dot overlay */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: selectedId
            ? (subjects.find((s) => s.id === selectedId)?.color ?? '#D1D5DB')
            : '#D1D5DB',
          pointerEvents: 'none',
          transition: 'background 0.15s',
        }}
      />

      {/* Chevron */}
      <div
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#9CA3AF',
          fontSize: 12,
        }}
      >
        ▾
      </div>
    </div>
  )
}
