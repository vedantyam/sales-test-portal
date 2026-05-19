'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore, getStoredUser } from '../../store/authStore'
import { adminApi } from '../../lib/api'

const NAV_ITEMS = [
  { href: '/admin/employees', label: 'Employees' },
  { href: '/admin/tests', label: 'Tests' },
  { href: '/admin/results', label: 'Results' },
  { href: '/admin/resources', label: 'Resources' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { accessToken, user, setAuth, clearAuth } = useAuthStore()

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
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
