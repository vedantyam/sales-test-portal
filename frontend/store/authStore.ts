'use client'

import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string
  department?: string
  email?: string
  role: 'employee' | 'admin'
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => {
    set({ accessToken, user })
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_user', JSON.stringify(user))
    }
  },
  clearAuth: () => {
    set({ accessToken: null, user: null })
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_user')
    }
  },
}))

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('auth_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function parseJWT(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}
