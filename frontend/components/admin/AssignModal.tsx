'use client'

import { useState } from 'react'
import { Employee } from '../../types'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { cn } from '../../lib/utils'

interface AssignModalProps {
  open: boolean
  testTitle: string
  employees: Employee[]
  onClose: () => void
  onAssign: (employeeIds: string[], windowStart: string, windowEnd: string) => Promise<void>
}

export default function AssignModal({ open, testTitle, employees, onClose, onAssign }: AssignModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const filtered = employees.filter(
    (e) =>
      e.is_active &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        e.department.toLowerCase().includes(search.toLowerCase()))
  )

  function toggleEmployee(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((e) => e.id)))
    }
  }

  async function handleAssign() {
    setError('')
    if (selected.size === 0) { setError('Select at least one employee'); return }
    if (!windowStart) { setError('Window start is required'); return }
    if (!windowEnd) { setError('Window end is required'); return }
    if (new Date(windowEnd) <= new Date(windowStart)) {
      setError('Window end must be after start')
      return
    }
    setLoading(true)
    try {
      await onAssign(Array.from(selected), windowStart, windowEnd)
      setSelected(new Set())
      setWindowStart('')
      setWindowEnd('')
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to assign'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title={`Assign: ${testTitle}`} size="lg">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Window Start"
            type="datetime-local"
            value={windowStart}
            onChange={(e) => setWindowStart(e.target.value)}
          />
          <Input
            label="Window End"
            type="datetime-local"
            value={windowEnd}
            onChange={(e) => setWindowEnd(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Employees ({selected.size} selected)
            </label>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 && (
              <p className="p-4 text-sm text-gray-400 text-center">No employees found</p>
            )}
            {filtered.map((emp) => (
              <label
                key={emp.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors',
                  selected.has(emp.id) && 'bg-blue-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(emp.id)}
                  onChange={() => toggleEmployee(emp.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{emp.name}</p>
                  <p className="text-xs text-gray-500 truncate">{emp.email} · {emp.department}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleAssign} loading={loading}>
            Assign to {selected.size} Employee{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
