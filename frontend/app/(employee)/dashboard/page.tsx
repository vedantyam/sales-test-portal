'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAuthStore } from '../../../store/authStore'
import { Assignment, Resource } from '../../../types'
import { formatDate, getTimeUntil } from '../../../lib/utils'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'

const CLOCK_DRIFT_THRESHOLD_MS = 30_000

function statusBadge(status: Assignment['status']) {
  const map: Record<Assignment['status'], { label: string; variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red' }> = {
    pending: { label: 'Pending', variant: 'yellow' },
    in_progress: { label: 'In Progress', variant: 'blue' },
    submitted: { label: 'Submitted', variant: 'green' },
    auto_submitted: { label: 'Auto Submitted', variant: 'gray' },
    expired: { label: 'Expired', variant: 'red' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' }
  return <Badge variant={variant}>{label}</Badge>
}

function DashboardContent() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [tab, setTab] = useState<'tests' | 'resources'>('tests')
  const [clockDrift, setClockDrift] = useState(false)

  const { data: assignments, isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      const res = await api.get('/employee/dashboard/assignments')
      return res.data.assignments
    },
  })

  const { data: resources, isLoading: loadingResources } = useQuery<Resource[]>({
    queryKey: ['resources'],
    queryFn: async () => {
      const res = await api.get('/employee/resources')
      return res.data.resources
    },
    enabled: tab === 'resources',
  })

  // Detect server clock drift using X-Server-Time response header
  useEffect(() => {
    api.get('/health').then((res) => {
      const serverTime = res.headers['x-server-time'] || res.data.time
      if (serverTime) {
        const drift = Math.abs(Date.now() - new Date(serverTime).getTime())
        setClockDrift(drift > CLOCK_DRIFT_THRESHOLD_MS)
      }
    }).catch(() => {})
  }, [])

  function handleLogout() {
    api.post('/auth/logout').catch(() => {})
    clearAuth()
    router.push('/login')
  }

  function canStartExam(a: Assignment): boolean {
    const now = new Date()
    return (
      a.status === 'pending' &&
      now >= new Date(a.window_start) &&
      now <= new Date(a.window_end)
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Welcome, {user?.name}</h1>
            <p className="text-xs text-gray-500">{user?.department}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Sign Out</Button>
        </div>
      </header>

      {clockDrift && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700 text-center">
          Your device clock may be out of sync. Exam timers are managed server-side.
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(['tests', 'resources'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'tests' ? 'My Tests' : 'Resources'}
            </button>
          ))}
        </div>

        {tab === 'tests' && (
          <div>
            {loadingAssignments && (
              <div className="text-center py-16 text-gray-400">Loading...</div>
            )}
            {!loadingAssignments && (!assignments || assignments.length === 0) && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">No tests assigned yet.</p>
              </div>
            )}
            {assignments && assignments.length > 0 && (
              <div className="space-y-4">
                {assignments.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{a.test_title}</h3>
                          {statusBadge(a.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span>
                            {a.duration_minutes} min
                            {a.section_count != null && ` · ${a.section_count} section${a.section_count !== 1 ? 's' : ''}`}
                            {a.total_questions != null && ` · ${a.total_questions} questions`}
                          </span>
                          <span>Window: {formatDate(a.window_start)} → {formatDate(a.window_end)}</span>
                        </div>
                        {a.status === 'pending' && new Date() < new Date(a.window_start) && (
                          <p className="text-xs text-blue-600 mt-1">
                            Opens in {getTimeUntil(a.window_start)}
                          </p>
                        )}
                      </div>
                      {(a.status === 'in_progress' || canStartExam(a)) && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/exam/${a.id}`)}
                        >
                          {a.status === 'in_progress' ? 'Resume' : 'Start Exam'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'resources' && (
          <div>
            {loadingResources && (
              <div className="text-center py-16 text-gray-400">Loading...</div>
            )}
            {!loadingResources && (!resources || resources.length === 0) && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">No resources available.</p>
              </div>
            )}
            {resources && resources.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition-all block"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{r.title}</h3>
                        {r.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    {r.category && <Badge variant="gray" className="mt-2">{r.category}</Badge>}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}
