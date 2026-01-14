import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from './types'
import { fetchCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister, fetchCsrf } from './api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await fetchCsrf()
      const u = await fetchCurrentUser()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (username: string, password: string) => {
    const loggedInUser = await apiLogin(username, password)
    setUser(loggedInUser)
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  const register = async (username: string, email: string, password: string) => {
    const newUser = await apiRegister(username, email, password)
    setUser(newUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
