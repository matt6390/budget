import type { CSSProperties, PropsWithChildren } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { COLORS } from '../ui'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/income', label: 'Income' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/import-pdf', label: '📄 Import PDF' },
  { to: '/import-history', label: '📋 Import History' },
  { to: '/categories', label: 'Categories' },
  { to: '/savings', label: '💰 Savings Goals' },
  { to: '/loans', label: '🏠 Loans' },
  { to: '/reports', label: '📊 Reports' },
]

export default function Layout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        <div>
          <div style={brandStyle}>💰 Budget</div>
          <nav style={navStyle}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  ...navLinkBase,
                  background: isActive ? 'var(--primary)' : 'transparent',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={footerStyle}>
          <div style={userTextStyle}>{user?.username ?? 'Signed in'}</div>
          <button onClick={toggleTheme} style={themeToggleStyle} type="button">
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={handleLogout} style={logoutButtonStyle} type="button">
            Log Out
          </button>
        </div>
      </aside>

      <main style={mainStyle}>{children}</main>
    </div>
  )
}

const shellStyle: CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
}

const sidebarStyle: CSSProperties = {
  width: '220px',
  minWidth: '220px',
  background: 'var(--nav-bg)',
  color: COLORS.white,
  padding: '1.5rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const brandStyle: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 800,
  marginBottom: '2rem',
  color: 'var(--invert)',
}

const navStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
}

const navLinkBase: CSSProperties = {
  color: 'var(--invert)',
  textDecoration: 'none',
  padding: '0.8rem 0.9rem',
  borderRadius: '10px',
  fontWeight: 600,
}

const footerStyle: CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.12)',
  paddingTop: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
}

const userTextStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '0.95rem',
  wordBreak: 'break-word',
}

const themeToggleStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: 'var(--invert)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '8px',
  padding: '0.55rem 0.85rem',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
}

const logoutButtonStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: 'var(--invert)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '8px',
  padding: '0.65rem 0.85rem',
  cursor: 'pointer',
  fontWeight: 700,
}

const mainStyle: CSSProperties = {
  flex: 1,
  background: 'var(--bg)',
  overflowY: 'auto',
  padding: '2rem',
}

