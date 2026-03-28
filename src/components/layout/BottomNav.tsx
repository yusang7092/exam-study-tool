import { NavLink } from 'react-router-dom'
import { navItems } from './navItems'
import NavIconSvg from './NavIcon'

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
      borderTop: '1px solid #e8e8e8',
      display: 'flex',
      alignItems: 'stretch',
      zIndex: 100,
    }}>
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            textDecoration: 'none',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 10,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? '#111111' : '#aaaaaa',
            letterSpacing: 0.1,
          })}
        >
          {({ isActive }) => (
            <>
              <NavIconSvg icon={item.icon} active={isActive} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
