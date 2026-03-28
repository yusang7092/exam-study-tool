interface ProgressBarProps {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#999', letterSpacing: 0.2 }}>
          {current} / {total}
        </span>
        <span style={{ fontSize: 11, color: '#bbb' }}>{pct}%</span>
      </div>
      <div style={{ height: 2, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#111', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}
