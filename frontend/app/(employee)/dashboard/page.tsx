'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { useAuthStore } from '../../../store/authStore'
import { Assignment, ResourceFolder, Resource } from '../../../types'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import TrainingTab from '../../../components/employee/TrainingTab'
import QuotationTab from '../../../components/employee/QuotationTab'
import ProfileCard from '../../../components/employee/ProfileCard'
import PlanComparison from '../../../components/employee/PlanComparison'

const CLOCK_DRIFT_THRESHOLD_MS = 30_000

function formatWindow(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${s.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

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

type DisplayStatus = 'upcoming' | 'active' | 'in_progress' | 'submitted' | 'auto_submitted' | 'expired'

function getDisplayStatus(a: Assignment, now: Date): DisplayStatus {
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

function statusBadge(status: DisplayStatus) {
  const map: Record<DisplayStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red' }> = {
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

function ResultPanel({ a }: { a: Assignment }) {
  if (!a.is_finalised) {
    return <p className="text-xs text-amber-600 mt-1">Result pending — under review</p>
  }
  if (!a.is_released) {
    return <p className="text-xs text-amber-600 mt-1">Result pending — scores being finalised</p>
  }
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5">
      <div className="flex items-center gap-2">
        {a.pass_fail === 'pass' ? (
          <span className="text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">Pass</span>
        ) : (
          <span className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">Fail</span>
        )}
        {a.total_score != null && (
          <span className="text-sm text-gray-600">
            Score: <strong>{a.total_score}{a.max_score != null ? `/${a.max_score}` : '%'}</strong>
          </span>
        )}
      </div>
      {(a.mcq_score != null || a.subjective_score != null) && (
        <div className="text-xs text-gray-500 flex gap-4">
          {a.mcq_score != null && <span>MCQ: {a.mcq_score}%</span>}
          {a.subjective_score != null
            ? <span>Subjective: {a.subjective_score}%</span>
            : <span>Subjective: Pending</span>
          }
        </div>
      )}
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [tab, setTab] = useState<'tests' | 'resources' | 'training' | 'quotation'>('tests')
  const [clockDrift, setClockDrift] = useState(false)
  const [, setTick] = useState(0)
  const [openFolders, setOpenFolders] = useState<string[]>([])
  const serverOffsetRef = useRef<number>(0)
  const [showProfile, setShowProfile] = useState(false)
  const [showPlanComparison, setShowPlanComparison] = useState(false)

  function getServerNow(): Date {
    return new Date(Date.now() + serverOffsetRef.current)
  }

  function toggleFolder(id: string) {
    setOpenFolders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const { data: assignments, isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: async (ctx) => {
      const res = await api.get('/employee/dashboard/assignments', { signal: ctx.signal })
      const serverTime = res.headers['x-server-time']
      if (serverTime) {
        serverOffsetRef.current = new Date(serverTime).getTime() - Date.now()
        setClockDrift(Math.abs(serverOffsetRef.current) > CLOCK_DRIFT_THRESHOLD_MS)
      }
      return res.data.assignments
    },
  })

  const { data: resourceData, isLoading: loadingResources } = useQuery<{ folders: ResourceFolder[]; uncategorized: Resource[] }>({
    queryKey: ['resources'],
    queryFn: async () => {
      const res = await api.get('/employee/resources')
      return res.data
    },
    enabled: tab === 'resources',
  })

  // Fetch server time on mount to correct for device clock skew
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data: { timestamp: number }) => {
        serverOffsetRef.current = data.timestamp - Date.now()
        setClockDrift(Math.abs(serverOffsetRef.current) > CLOCK_DRIFT_THRESHOLD_MS)
      })
      .catch(() => {})
  }, [])

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Welcome, {user?.name}</h1>
            <p className="text-xs text-gray-500">{user?.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              title="My Profile"
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#1a1f2e', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 600,
                color: 'white', letterSpacing: 1, flexShrink: 0,
              }}>
                {(user?.name || '').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'ME'}
              </div>
              {user?.name?.split(' ')[0]}
            </button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>Sign Out</Button>
          </div>
        </div>
      </header>

      {showProfile && (
        <ProfileCard onClose={() => setShowProfile(false)} />
      )}
      {showPlanComparison && (
        <PlanComparison onClose={() => setShowPlanComparison(false)} />
      )}

      {clockDrift && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700 text-center">
          Your device clock may be out of sync. Exam timers are managed server-side.
        </div>
      )}

      <main className={`mx-auto px-4 py-8 ${tab === 'quotation' ? 'max-w-7xl' : 'max-w-5xl'}`}>
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit no-print">
          {(['tests', 'resources', 'training', 'quotation'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'tests' ? 'My Tests' : t === 'resources' ? 'Resources' : t === 'training' ? 'Training' : 'Quotation'}
            </button>
          ))}
        </div>

        {tab === 'tests' && (
          <div>
            {loadingAssignments && <div className="text-center py-16 text-gray-400">Loading...</div>}
            {!loadingAssignments && (!assignments || assignments.length === 0) && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">No tests assigned yet.</p>
              </div>
            )}
            {assignments && assignments.length > 0 && (
              <div className="space-y-4">
                {assignments.map((a) => {
                  const status = getDisplayStatus(a, now)
                  const windowStart = new Date(a.window_start)
                  const windowEnd = new Date(a.window_end)
                  const isDone = status === 'submitted' || status === 'auto_submitted'

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
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'inherit', marginBottom: 6 }}>
                            {a.test_title || 'Test'}
                          </div>

                          <div className="flex items-center gap-2 mb-1">
                            {statusBadge(status)}
                          </div>

                          <p className="text-xs text-gray-500 mb-1">{formatWindow(a.window_start, a.window_end)}</p>

                          {status === 'upcoming' && (
                            <p className="text-xs text-blue-600 font-medium">
                              Opens in {formatCountdown(windowStart.getTime() - now.getTime())}
                            </p>
                          )}

                          {(status === 'active' || status === 'in_progress') && (
                            <p className="text-xs text-orange-600 font-medium">
                              Closes in {formatCountdown(windowEnd.getTime() - now.getTime())}
                            </p>
                          )}

                          {isDone && <ResultPanel a={a} />}

                          {status === 'expired' && (
                            <p className="text-xs text-red-500 mt-1">Window closed</p>
                          )}
                        </div>

                        {(status === 'active' || status === 'in_progress') && (
                          <Button size="sm" onClick={() => router.push(`/exam/${a.id}`)}>
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
            {/* Plan comparison card */}
            <div
              onClick={() => setShowPlanComparison(true)}
              className="flex items-center justify-between border border-gray-200 rounded-xl px-5 py-4 mb-4 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-gray-900 mb-0.5">📊 Plan Comparison Guide</div>
                <div className="text-xs text-gray-500">Compare all plans, edit prices, and download PDF for clients</div>
              </div>
              <div className="text-sm text-gray-400 flex-shrink-0 ml-4">View →</div>
            </div>

            {loadingResources && <div className="text-center py-16 text-gray-400">Loading...</div>}
            {!loadingResources && (!resourceData || (resourceData.folders.length === 0 && resourceData.uncategorized.length === 0)) && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">No resources available.</p>
              </div>
            )}
            {resourceData && (
              <div className="space-y-3">
                {resourceData.folders.map((folder) => (
                  <div key={folder.id} className="overflow-hidden">
                    <div
                      className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderRadius: openFolders.includes(folder.id) ? '8px 8px 0 0' : 8 }}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <span className="text-base">{openFolders.includes(folder.id) ? '📂' : '📁'}</span>
                      <span className="font-medium text-sm text-gray-900">{folder.name}</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {folder.resources.length} file{folder.resources.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {openFolders.includes(folder.id) && (
                      <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
                        {folder.resources.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-400 text-center">Empty folder</div>
                        ) : (
                          folder.resources.map((r, idx) => (
                            <div
                              key={r.id}
                              className={`flex items-center gap-3 px-4 py-3 ${idx < folder.resources.length - 1 ? 'border-b border-gray-100' : ''}`}
                            >
                              <span className="text-base">🔗</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                                {r.description && (
                                  <div className="text-xs text-gray-500">{r.description}</div>
                                )}
                              </div>
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-700 no-underline border border-gray-200 rounded-md px-2.5 py-1 hover:bg-gray-50 flex-shrink-0"
                              >
                                Open
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {resourceData.uncategorized.length > 0 && (
                  <div>
                    {resourceData.folders.length > 0 && (
                      <p className="text-xs text-gray-400 mb-2">Other resources</p>
                    )}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {resourceData.uncategorized.map((r, idx) => (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 px-4 py-3 ${idx < resourceData.uncategorized.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                          <span className="text-base">🔗</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                            {r.description && (
                              <div className="text-xs text-gray-500">{r.description}</div>
                            )}
                          </div>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-700 no-underline border border-gray-200 rounded-md px-2.5 py-1 hover:bg-gray-50 flex-shrink-0"
                          >
                            Open
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'training' && <TrainingTab />}

        {tab === 'quotation' && <QuotationTab />}
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
