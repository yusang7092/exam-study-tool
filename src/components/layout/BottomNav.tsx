import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '대시보드', icon: '🏠', end: true },
  { to: '/upload', label: '업로드', icon: '📤', end: false },
  { to: '/review', label: '오답복습', icon: '📝', end: false },
  { to: '/settings', label: '설정', icon: '⚙️', end: false },
]

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(56px + env(safe-area-inset-bottom))',
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 100,
    }}>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            textDecoration: 'none',
            color: isActive ? '#6366f1' : '#9ca3af',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 10,
            fontWeight: isActive ? 600 : 400,
            transition: 'color 0.15s',
          })}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
