'use client'

import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../../lib/api'
import { DashboardStats } from '../../../types'
import { formatDate } from '../../../lib/utils'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/dashboard')
      return res.data
    },
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={data?.total_employees ?? 0} />
        <StatCard label="Active Tests" value={data?.active_tests ?? 0} sub="published" />
        <StatCard label="Pending Results" value={data?.pending_results ?? 0} sub="awaiting scoring" />
        <StatCard label="Today" value={new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {!data?.recent_audits?.length && (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">No recent activity</p>
          )}
          {data?.recent_audits?.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{log.action}</span>
                  {' '}
                  <span className="text-gray-500">{log.entity_type}</span>
                  {log.entity_id && <span className="text-gray-400"> #{log.entity_id.slice(0, 8)}</span>}
                </p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.created_at)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
