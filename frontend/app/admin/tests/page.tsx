'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { adminApi } from '../../../lib/api'
import { Employee } from '../../../types'
import { formatDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import AssignModal from '../../../components/admin/AssignModal'
import Notification from '../../../components/ui/Notification'

interface TestListItem {
  id: string
  title: string
  description?: string
  duration_minutes: number
  status: 'draft' | 'published'
  created_at: string
  section_count: number
  total_questions: number
  assignment_count: number
}

export default function TestsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [assignTarget, setAssignTarget] = useState<TestListItem | null>(null)
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const { data: tests, isLoading } = useQuery<TestListItem[]>({
    queryKey: ['tests'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/tests')
      return res.data.tests
    },
  })

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/employees')
      return res.data.employees
    },
  })

  const publishMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'publish' | 'unpublish' }) => {
      await adminApi.patch(`/admin/tests/${id}/${action}`)
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      setNotification({ msg: `Test ${action}ed`, type: 'success' })
    },
    onError: () => setNotification({ msg: 'Action failed', type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApi.delete(`/admin/tests/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      setNotification({ msg: 'Test deleted', type: 'success' })
    },
    onError: (e: any) => {
      const msg = e.response?.data?.error || 'Failed to delete test'
      setNotification({ msg, type: 'error' })
    },
  })

  const assignMutation = useMutation({
    mutationFn: async ({
      testId, employeeIds, windowStart, windowEnd,
    }: { testId: string; employeeIds: string[]; windowStart: string; windowEnd: string }) => {
      const res = await adminApi.post('/admin/assignments', {
        test_id: testId,
        employee_ids: employeeIds,
        window_start: windowStart,
        window_end: windowEnd,
      })
      return res.data
    },
    onSuccess: (data) => {
      setNotification({ msg: `Assigned to ${data.created} employee(s). Skipped: ${data.skipped}`, type: 'success' })
      setAssignTarget(null)
    },
    onError: () => setNotification({ msg: 'Assignment failed', type: 'error' }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Tests</h1>
        <Button onClick={() => router.push('/admin/tests/new')}>Create Test</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : !tests?.length ? (
          <div className="text-center py-16 text-gray-400 text-sm">No tests yet. Create one to get started.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tests.map((test) => (
              <div key={test.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{test.title}</h3>
                    <Badge variant={test.status === 'published' ? 'green' : 'gray'}>
                      {test.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {Number(test.section_count)} section{Number(test.section_count) !== 1 ? 's' : ''} ·{' '}
                    {Number(test.total_questions)} question{Number(test.total_questions) !== 1 ? 's' : ''} ·{' '}
                    {test.duration_minutes} min ·{' '}
                    Created {formatDate(test.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/admin/tests/${test.id}`)}
                  >
                    Edit
                  </Button>
                  {test.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => publishMutation.mutate({ id: test.id, action: 'publish' })}
                    >
                      Publish
                    </Button>
                  )}
                  {test.status === 'published' && (
                    <>
                      <Button size="sm" onClick={() => setAssignTarget(test)}>Assign</Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => publishMutation.mutate({ id: test.id, action: 'unpublish' })}
                      >
                        Unpublish
                      </Button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this test? This will also delete all assignments and results.')) {
                        deleteMutation.mutate(test.id)
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {assignTarget && (
        <AssignModal
          open
          testTitle={assignTarget.title}
          employees={employees ?? []}
          onClose={() => setAssignTarget(null)}
          onAssign={(employeeIds, windowStart, windowEnd) =>
            assignMutation.mutateAsync({ testId: assignTarget.id, employeeIds, windowStart, windowEnd })
          }
        />
      )}

      {notification && (
        <Notification
          message={notification.msg}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}
    </div>
  )
}
