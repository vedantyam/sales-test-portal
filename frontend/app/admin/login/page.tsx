'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import { useAuthStore, parseJWT } from '../../../store/authStore'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

export default function AdminLoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Email and password required'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/admin/login', { email: email.trim(), password })
      const token: string = res.data.access_token
      const payload = parseJWT(token)
      setAuth(token, {
        id: payload.sub as string,
        name: payload.name as string,
        email: payload.email as string,
        role: 'admin',
      })
      router.push('/admin/dashboard')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage assessments</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@company.com"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
