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
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const filtered = employees.filter(
    (e) =>
      e.is_active &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
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

  function buildWindowISO(d: string, t: string): string {
    // new Date("YYYY-MM-DDTHH:MM") treats as local time → .toISOString() gives correct UTC
    return new Date(`${d}T${t}`).toISOString()
  }

  function validate(): string {
    if (!date) return 'Please select a date'
    if (!startTime) return 'Please select a start time'
    if (!endTime) return 'Please select an end time'
    if (selected.size === 0) return 'Select at least one employee'
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)
    if (end <= start) return 'End time must be after start time'
    if (start < new Date()) return 'Start time cannot be in the past'
    return ''
  }

  async function handleAssign() {
    setError('')
    const msg = validate()
    if (msg) { setError(msg); return }
    setLoading(true)
    try {
      const windowStart = buildWindowISO(date, startTime)
      const windowEnd = buildWindowISO(date, endTime)
      await onAssign(Array.from(selected), windowStart, windowEnd)
      setSelected(new Set())
      setDate('')
      setStartTime('')
      setEndTime('')
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to assign')
    } finally {
      setLoading(false)
    }
  }

  const windowPreview = date && startTime && endTime
    ? `${new Date(`${date}T${startTime}`).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} → ${new Date(`${date}T${endTime}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
    : null

  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title={`Assign: ${testTitle}`} size="lg">
      <div className="p-6 space-y-5">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam date</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Time window */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Window preview */}
        {windowPreview && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700">
            Window: {windowPreview}
          </div>
        )}

        {/* Employee list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Employees ({selected.size} selected)
            </label>
            <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800">
              {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
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
                  <p className="text-xs text-gray-500 truncate">{emp.department}</p>
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
