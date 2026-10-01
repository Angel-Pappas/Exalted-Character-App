import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

export type UserRole = 'admin' | 'player'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
}

interface AuthContextType {
  user: AuthUser | null
  username: string
  role: UserRole | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signUp: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  changeUsername: (username: string) => Promise<{ error: string | null }>
  changePassword: (currentPassword: string, password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ user: AuthUser | null }>('GET', 'me').then(({ data }) => {
      setUser(data?.user ?? null)
      setLoading(false)
    })
  }, [])

  async function signIn(username: string, password: string) {
    const { data, error } = await api<{ user: AuthUser }>('POST', 'login', { username, password })
    if (data) setUser(data.user)
    return { error }
  }

  async function signUp(username: string, password: string) {
    const { data, error } = await api<{ user: AuthUser }>('POST', 'register', { username, password })
    if (data) setUser(data.user)
    return { error }
  }

  async function signOut() {
    await api('POST', 'logout')
    setUser(null)
  }

  async function changeUsername(username: string) {
    const { data, error } = await api<{ user: AuthUser }>('PUT', 'me/username', { username })
    if (data) setUser(data.user)
    return { error }
  }

  async function changePassword(currentPassword: string, password: string) {
    const { error } = await api('PUT', 'me/password', { current_password: currentPassword, password })
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      user,
      username: user?.username ?? '',
      role: user?.role ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      changeUsername,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
