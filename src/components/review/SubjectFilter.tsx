import type { Subject } from '@/types/index'

interface SubjectFilterProps {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function SubjectFilter({ subjects, selectedId, onSelect }: SubjectFilterProps) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style>{`.sf-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div className="sf-scroll" style={{ display: 'flex', gap: 0, padding: '0 16px 0', whiteSpace: 'nowrap', minWidth: 'max-content' }}>
        <button
          onClick={() => onSelect(null)}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderBottom: selectedId === null ? '2px solid #111' : '2px solid transparent',
            background: 'transparent',
            color: selectedId === null ? '#111' : '#999',
            fontWeight: selectedId === null ? 600 : 400,
            fontSize: 13,
            cursor: 'pointer',
            minHeight: 44,
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          전체
        </button>

        {subjects.map(subject => {
          const isSelected = selectedId === subject.id
          return (
            <button
              key={subject.id}
              onClick={() => onSelect(subject.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px',
                border: 'none',
                borderBottom: isSelected ? '2px solid #111' : '2px solid transparent',
                background: 'transparent',
                color: isSelected ? '#111' : '#999',
                fontWeight: isSelected ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                minHeight: 44,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
              {subject.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
