import type { Subject } from '@/types/index'

interface SubjectFilterProps {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function SubjectFilter({ subjects, selectedId, onSelect }: SubjectFilterProps) {
  return (
    <div style={{
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      <style>{`.subject-filter-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="subject-filter-scroll"
        style={{
          display: 'flex',
          gap: 4,
          padding: '12px 16px',
          whiteSpace: 'nowrap',
          minWidth: 'max-content',
        }}
      >
        {/* "전체" tab */}
        <button
          onClick={() => onSelect(null)}
          style={{
            padding: '7px 16px',
            border: 'none',
            borderBottom: selectedId === null ? '2px solid #6366f1' : '2px solid transparent',
            background: 'transparent',
            color: selectedId === null ? '#6366f1' : '#6b7280',
            fontWeight: selectedId === null ? 700 : 400,
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: 44,
            transition: 'all 0.15s',
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                border: 'none',
                borderBottom: isSelected ? '2px solid #6366f1' : '2px solid transparent',
                background: 'transparent',
                color: isSelected ? '#6366f1' : '#6b7280',
                fontWeight: isSelected ? 700 : 400,
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                minHeight: 44,
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: subject.color,
                flexShrink: 0,
              }} />
              {subject.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
