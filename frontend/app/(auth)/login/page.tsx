'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import { useAuthStore, parseJWT } from '../../../store/authStore'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!key.trim()) { setError('Access key is required'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/employee/login', { access_key: key.trim() })
      const token: string = res.data.access_token
      const payload = parseJWT(token)
      setAuth(token, {
        id: payload.sub as string,
        name: payload.name as string,
        department: payload.department as string | undefined,
        email: payload.email as string | undefined,
        role: 'employee',
      })
      router.push('/dashboard')
    } catch {
      setError('Invalid access key. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Assessment Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your access key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Access Key"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="e.g. ABCD1234EFGH"
            autoFocus
            autoComplete="off"
            className="font-mono tracking-widest"
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

        <p className="mt-6 text-center text-xs text-gray-400">
          Contact HR if you haven&apos;t received your access key.
        </p>
      </div>
    </div>
  )
}
