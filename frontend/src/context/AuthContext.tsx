import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import client, { tokenStorage } from '../api/client'
import type { User } from '../types'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = async () => {
    if (!tokenStorage.hasAccessToken()) {
      setUser(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const res = await client.get<User>('/auth/me/')
      setUser(res.data)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchUser()
  }, [])

  const logout = async () => {
    try {
      await client.post('/auth/logout/')
    } catch {
      // ignore
    }

    tokenStorage.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, isLoading, logout, refreshUser: fetchUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
