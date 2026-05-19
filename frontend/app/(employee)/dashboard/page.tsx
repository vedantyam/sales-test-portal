'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAuthStore } from '../../../store/authStore'
import { Assignment, Resource } from '../../../types'
import { formatDate } from '../../../lib/utils'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'

const CLOCK_DRIFT_THRESHOLD_MS = 30_000

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

type AssignmentStatus = 'upcoming' | 'active' | 'in_progress' | 'submitted' | 'auto_submitted' | 'expired'

function getAssignmentStatus(a: Assignment, now: Date): AssignmentStatus {
  if (a.status === 'submitted') return 'submitted'
  if (a.status === 'auto_submitted') return 'auto_submitted'
  if (a.status === 'expired') return 'expired'
  if (a.status === 'in_progress') return 'in_progress'
  const windowStart = new Date(a.window_start)
  const windowEnd = new Date(a.window_end)
  if (now < windowStart) return 'upcoming'
  if (now > windowEnd) return 'expired'
  return 'active'
}

function statusBadge(status: AssignmentStatus) {
  const map: Record<AssignmentStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red' }> = {
    upcoming: { label: 'Upcoming', variant: 'yellow' },
    active: { label: 'Active', variant: 'blue' },
    in_progress: { label: 'In Progress', variant: 'blue' },
    submitted: { label: 'Submitted', variant: 'green' },
    auto_submitted: { label: 'Auto-submitted', variant: 'gray' },
    expired: { label: 'Expired', variant: 'red' },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

function DashboardContent() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [tab, setTab] = useState<'tests' | 'resources'>('tests')
  const [clockDrift, setClockDrift] = useState(false)
  const [tick, setTick] = useState(0)
  const serverOffsetRef = useRef<number>(0)

  function getServerNow(): Date {
    return new Date(Date.now() + serverOffsetRef.current)
  }

  const { data: assignments, isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: async (ctx) => {
      const res = await api.get('/employee/dashboard/assignments', { signal: ctx.signal })
      const serverTime = res.headers['x-server-time']
      if (serverTime) {
        serverOffsetRef.current = new Date(serverTime).getTime() - Date.now()
        const drift = Math.abs(serverOffsetRef.current)
        setClockDrift(drift > CLOCK_DRIFT_THRESHOLD_MS)
      }
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

  // 30s tick to re-evaluate countdown/status
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  function handleLogout() {
    api.post('/auth/logout').catch(() => {})
    clearAuth()
    router.push('/login')
  }

  const now = getServerNow()

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
                {assignments.map((a) => {
                  const status = getAssignmentStatus(a, now)
                  const windowStart = new Date(a.window_start)
                  const windowEnd = new Date(a.window_end)

                  return (
                    <div
                      key={a.id}
                      className={`bg-white rounded-xl border p-5 ${
                        status === 'active' || status === 'in_progress'
                          ? 'border-blue-200 shadow-sm'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{a.test_title}</h3>
                            {statusBadge(status)}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span>
                              {a.duration_minutes} min
                              {a.section_count != null && ` · ${a.section_count} section${Number(a.section_count) !== 1 ? 's' : ''}`}
                              {a.total_questions != null && ` · ${a.total_questions} question${Number(a.total_questions) !== 1 ? 's' : ''}`}
                            </span>
                          </div>

                          {status === 'upcoming' && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Opens in {formatCountdown(windowStart.getTime() - now.getTime())}
                              <span className="text-gray-400 font-normal ml-2">({formatDate(a.window_start)})</span>
                            </p>
                          )}

                          {(status === 'active' || status === 'in_progress') && (
                            <p className="text-xs text-orange-600 mt-1 font-medium">
                              Closes in {formatCountdown(windowEnd.getTime() - now.getTime())}
                              <span className="text-gray-400 font-normal ml-2">({formatDate(a.window_end)})</span>
                            </p>
                          )}

                          {(status === 'submitted' || status === 'auto_submitted') && (
                            <div className="mt-1 text-xs text-gray-500">
                              {a.pass_fail && (
                                <span className={`font-medium mr-2 ${a.pass_fail === 'pass' ? 'text-green-700' : 'text-red-700'}`}>
                                  {a.pass_fail === 'pass' ? 'Passed' : 'Failed'}
                                </span>
                              )}
                              {a.total_score != null && (
                                <span>Score: {a.total_score}</span>
                              )}
                              {!a.is_finalised && <span className="ml-2 text-amber-600">Pending review</span>}
                            </div>
                          )}

                          {status === 'expired' && (
                            <p className="text-xs text-red-500 mt-1">Window closed {formatDate(a.window_end)}</p>
                          )}
                        </div>

                        {(status === 'active' || status === 'in_progress') && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/exam/${a.id}`)}
                          >
                            {status === 'in_progress' ? 'Resume' : 'Start Exam'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
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
