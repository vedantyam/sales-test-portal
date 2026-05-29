'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore, getStoredUser } from '../../store/authStore'
import { adminApi } from '../../lib/api'

const NAV_ITEMS = [
  { href: '/admin/employees', label: 'Employees' },
  { href: '/admin/tests', label: 'Tests' },
  { href: '/admin/results', label: 'Results' },
  { href: '/admin/resources', label: 'Resources' },
  { href: '/admin/training', label: 'Training' },
  { href: '/admin/quotations', label: 'Quotations' },
]

interface AdminProfile { id: string; name: string; email: string; phone?: string }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { accessToken, user, setAuth, clearAuth } = useAuthStore()
  const [showProfile, setShowProfile] = useState(false)
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [adminPhone, setAdminPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) return
    if (!accessToken && !user) {
      const stored = getStoredUser()
      if (stored?.role === 'admin') {
        setAuth('', stored)
      } else {
        router.replace('/admin/login')
      }
    } else if (user && user.role !== 'admin') {
      router.replace('/login')
    }
  }, [accessToken, user, isLoginPage, router, setAuth])

  function handleLogout() {
    adminApi.post('/auth/logout').catch(() => {})
    clearAuth()
    router.push('/admin/login')
  }

  function openAdminProfile() {
    adminApi.get('/admin/me').then((r) => {
      setAdminProfile(r.data.admin)
      setAdminPhone(r.data.admin.phone || '')
    }).catch(() => {})
    setShowProfile(true)
    setProfileMsg(null)
  }

  async function handleSaveAdminProfile() {
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await adminApi.patch('/admin/me', { phone: adminPhone })
      setProfileMsg({ text: 'Saved', ok: true })
      setAdminProfile((p) => p ? { ...p, phone: adminPhone } : p)
    } catch {
      setProfileMsg({ text: 'Save failed', ok: false })
    } finally {
      setProfileSaving(false)
    }
  }

  if (isLoginPage) return <>{children}</>

  if (!accessToken && !getStoredUser()) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-14 gap-6">
            <span className="font-semibold text-gray-900 text-sm flex-shrink-0">Sales Portal Admin</span>
            <nav className="flex items-center gap-1 flex-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={openAdminProfile}
              className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0 flex items-center gap-1"
              title="My Profile"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>

      {/* Admin Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">My Profile</h3>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="text-sm text-gray-900">{adminProfile?.name || user?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-900">{adminProfile?.email || '—'}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone number</label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              {profileMsg && (
                <p className={`text-xs ${profileMsg.ok ? 'text-green-700' : 'text-red-600'}`}>{profileMsg.text}</p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowProfile(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Close
              </button>
              <button onClick={handleSaveAdminProfile} disabled={profileSaving} className="flex-[2] py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                {profileSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
