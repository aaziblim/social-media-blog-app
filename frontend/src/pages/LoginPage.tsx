import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    navigate('/')
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Please enter username and password.')
      return
    }
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
              <circle cx="12" cy="12" r="10" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in to continue to sphere
          </p>
        </div>

        {/* Form Card */}
        <div 
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--card-shadow)' }}
        >
          {error && (
            <div 
              className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--danger)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)'
                }}
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? (
                <>
                  <div 
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div 
            className="mt-5 pt-5 text-center text-sm"
            style={{ borderTop: '1px solid var(--border-light)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
