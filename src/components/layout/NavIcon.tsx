import type { NavIcon } from './navItems'

const size = 20

export default function NavIconSvg({ icon, active }: { icon: NavIcon; active: boolean }) {
  const color = active ? '#111111' : '#aaaaaa'
  const stroke = { stroke: color, fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (icon === 'home') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path {...stroke} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path {...stroke} d="M9 21V12h6v9" />
    </svg>
  )

  if (icon === 'upload') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path {...stroke} d="M12 16V4m0 0L8 8m4-4l4 4" />
      <path {...stroke} d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </svg>
  )

  if (icon === 'review') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect {...stroke} x="4" y="3" width="16" height="18" rx="2" />
      <path {...stroke} d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )

  if (icon === 'settings') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle {...stroke} cx="12" cy="12" r="3" />
      <path {...stroke} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )

  return null
}
