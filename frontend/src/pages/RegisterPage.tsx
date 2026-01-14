import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    navigate('/')
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !email || !password) {
      setError('All fields are required.')
      return
    }
    if (password !== password2) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register(username, email, password)
      navigate('/')
    } catch {
      setError('Registration failed. Username may already be taken.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
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
            Join sphere
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Create your account and start sharing
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
                placeholder="Choose a username"
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
                htmlFor="email" 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="your@email.com"
                autoComplete="email"
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
                placeholder="At least 6 characters"
                autoComplete="new-password"
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
                htmlFor="password2" 
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Confirm Password
              </label>
              <input
                id="password2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
                placeholder="Repeat password"
                autoComplete="new-password"
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div 
            className="mt-5 pt-5 text-center text-sm"
            style={{ borderTop: '1px solid var(--border-light)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
