'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, getStoredUser } from '../../store/authStore'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { accessToken, user, setAuth } = useAuthStore()

  useEffect(() => {
    if (!accessToken) {
      const stored = getStoredUser()
      if (stored) {
        // Token lost on page refresh — api interceptor will refresh via cookie on next request
        // Restore user so UI doesn't flash empty
        setAuth('', stored)
      } else {
        router.replace('/login')
      }
    } else if (user && user.role !== 'employee') {
      router.replace('/admin/dashboard')
    }
  }, [accessToken, user, router, setAuth])

  if (!accessToken && !getStoredUser()) return null

  return <>{children}</>
}
