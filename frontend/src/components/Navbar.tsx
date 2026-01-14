import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useTheme } from '../ThemeContext'

export default function Navbar() {
  const { user, logout, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-lg"
      style={{ 
        backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" style={{ color: 'var(--accent)' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
            <span className="text-xl font-semibold tracking-tight hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              sphere
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button 
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {loading ? (
              <div className="w-9 h-9 rounded-full skeleton" />
            ) : user ? (
              <>
                {/* Create button - desktop */}
                <Link 
                  to="/posts/new" 
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New Post</span>
                </Link>
                
                {/* Profile dropdown */}
                <div className="relative group">
                  <button className="flex items-center">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 transition-colors" style={{ borderColor: 'var(--border)' }}>
                      {user.profile?.image ? (
                        <img src={user.profile.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: 'var(--accent)' }}>
                          {user.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Dropdown */}
                  <div 
                    className="absolute right-0 top-full mt-2 w-52 py-1 rounded-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{user.username}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                    </div>
                    <Link to={`/user/${user.username}`} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-tertiary)]" style={{ color: 'var(--text-primary)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      View Profile
                    </Link>
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-tertiary)]" style={{ color: 'var(--text-primary)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Settings
                    </Link>
                    <hr style={{ borderColor: 'var(--border)' }} />
                    <button 
                      onClick={handleLogout} 
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                      style={{ color: 'var(--danger)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 rounded-full text-white text-sm font-medium transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
