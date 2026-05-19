'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../../lib/api'
import { Employee } from '../../../types'
import { formatDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Badge from '../../../components/ui/Badge'
import EmployeeForm from '../../../components/admin/EmployeeForm'
import KeyDisplayModal from '../../../components/admin/KeyDisplayModal'
import Notification from '../../../components/ui/Notification'

export default function EmployeesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [keyModal, setKeyModal] = useState<{ name: string; key: string } | null>(null)
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/employees')
      return res.data.employees
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; department: string }) => {
      const res = await adminApi.post('/admin/employees', data)
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setKeyModal({ name: data.employee.name, key: data.access_key })
      setPanelOpen(false)
    },
    onError: () => setNotification({ msg: 'Failed to create employee', type: 'error' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; department: string } }) => {
      await adminApi.patch(`/admin/employees/${id}`, data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setNotification({ msg: 'Employee updated', type: 'success' })
      setPanelOpen(false)
    },
    onError: () => setNotification({ msg: 'Failed to update', type: 'error' }),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await adminApi.patch(`/admin/employees/${id}/status`, { is_active: active })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
    onError: () => setNotification({ msg: 'Failed to update status', type: 'error' }),
  })

  const regenKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminApi.post(`/admin/employees/${id}/regenerate-key`)
      return res.data
    },
    onSuccess: (data, id) => {
      const emp = employees?.find((e) => e.id === id)
      if (emp) setKeyModal({ name: emp.name, key: data.access_key })
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: () => setNotification({ msg: 'Failed to regenerate key', type: 'error' }),
  })

  const filtered = (employees ?? []).filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave(data: { name: string; email: string; department: string }) {
    if (editingEmployee) {
      await updateMutation.mutateAsync({ id: editingEmployee.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Employees</h1>
        <Button onClick={() => { setEditingEmployee(null); setPanelOpen(true) }}>Add Employee</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <Input
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No employees found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Department</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Created</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{emp.department}</td>
                    <td className="px-5 py-3">
                      <Badge variant={emp.is_active ? 'green' : 'gray'}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(emp.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => { setEditingEmployee(emp); setPanelOpen(true) }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => regenKeyMutation.mutate(emp.id)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Regen Key
                        </button>
                        <button
                          onClick={() => toggleStatusMutation.mutate({ id: emp.id, active: !emp.is_active })}
                          className={`text-xs ${emp.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {emp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setPanelOpen(false)} />
      )}

      <EmployeeForm
        open={panelOpen}
        employee={editingEmployee}
        onClose={() => setPanelOpen(false)}
        onSave={handleSave}
      />

      {keyModal && (
        <KeyDisplayModal
          open
          employeeName={keyModal.name}
          accessKey={keyModal.key}
          onClose={() => setKeyModal(null)}
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
