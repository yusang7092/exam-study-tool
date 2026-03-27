import { NavLink, Outlet } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import BottomNav from './BottomNav'

const navItems = [
  { to: '/', label: '대시보드', icon: '🏠', end: true },
  { to: '/upload', label: '업로드', icon: '📤', end: false },
  { to: '/review', label: '오답복습', icon: '📝', end: false },
  { to: '/settings', label: '설정', icon: '⚙️', end: false },
]

export default function AppShell() {
  const { signOut } = useAuth()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar — desktop only */}
      <aside style={{
        width: 220,
        background: '#f3f4f6',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 50,
      }}
        className="app-sidebar"
      >
        {/* Logo */}
        <div style={{
          padding: '24px 20px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>📚 시험 학습 도구</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Exam Study Tool</div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                textDecoration: 'none',
                color: isActive ? '#6366f1' : '#374151',
                background: isActive ? '#ede9fe' : 'transparent',
                borderRadius: 8,
                margin: '2px 8px',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 16px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={() => void signOut()}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              color: '#6b7280',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#dc2626'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
            }}
          >
            🚪 로그아웃
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="app-main"
        style={{
          flex: 1,
          marginLeft: 220,
          minHeight: '100vh',
          background: '#ffffff',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </main>

      {/* Bottom nav — mobile/iPad only */}
      <div className="app-bottom-nav">
        <BottomNav />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .app-sidebar { display: none !important; }
          .app-main { margin-left: 0 !important; padding-bottom: calc(56px + env(safe-area-inset-bottom)); }
          .app-bottom-nav { display: block; }
        }
        @media (min-width: 769px) {
          .app-bottom-nav { display: none; }
        }
      `}</style>
    </div>
  )
}
