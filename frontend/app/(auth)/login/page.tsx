'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import { useAuthStore, parseJWT } from '../../../store/authStore'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg border border-gray-200 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Sales Portal</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your access key to continue</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD1234EFGH"
              autoFocus
              autoComplete="off"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium mt-4 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Contact HR if you haven&apos;t received your access key.
        </p>
      </div>
    </div>
  )
}
