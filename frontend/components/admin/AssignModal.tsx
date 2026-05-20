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

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function to24h(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour, 10)
  if (period === 'AM' && h === 12) h = 0
  if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2, '0')}:${minute}`
}

function buildWindowISO(date: string, hour: string, minute: string, period: 'AM' | 'PM'): string {
  return new Date(`${date}T${to24h(hour, minute, period)}`).toISOString()
}

export default function AssignModal({ open, testTitle, employees, onClose, onAssign }: AssignModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [date, setDate] = useState('')
  const [startHour, setStartHour] = useState('')
  const [startMinute, setStartMinute] = useState('')
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM')
  const [endHour, setEndHour] = useState('')
  const [endMinute, setEndMinute] = useState('')
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('AM')
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

  const timeComplete = startHour && startMinute && endHour && endMinute

  const windowPreview = date && timeComplete
    ? (() => {
        const start = new Date(`${date}T${to24h(startHour, startMinute, startPeriod)}`)
        const end = new Date(`${date}T${to24h(endHour, endMinute, endPeriod)}`)
        return `${start.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} → ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      })()
    : null

  function validate(): string {
    if (!date) return 'Please select a date'
    if (!startHour || !startMinute) return 'Please select a start time'
    if (!endHour || !endMinute) return 'Please select an end time'
    if (selected.size === 0) return 'Select at least one employee'

    const start = new Date(`${date}T${to24h(startHour, startMinute, startPeriod)}`)
    const end = new Date(`${date}T${to24h(endHour, endMinute, endPeriod)}`)

    if (start < new Date()) return 'Start time cannot be in the past'
    if (end <= start) return 'End time must be after start time'
    return ''
  }

  async function handleAssign() {
    setError('')
    const msg = validate()
    if (msg) { setError(msg); return }
    setLoading(true)
    try {
      const windowStart = buildWindowISO(date, startHour, startMinute, startPeriod)
      const windowEnd = buildWindowISO(date, endHour, endMinute, endPeriod)
      await onAssign(Array.from(selected), windowStart, windowEnd)
      setSelected(new Set())
      setDate('')
      setStartHour('')
      setStartMinute('')
      setEndHour('')
      setEndMinute('')
      onClose()
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to assign')
    } finally {
      setLoading(false)
    }
  }

  const selectCls = 'border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'
  const periodCls = (active: boolean) =>
    cn('px-3 py-2 text-sm font-medium border transition-colors rounded-lg',
      active ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50')

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
          <p className="text-xs text-gray-400 mt-1">The date on which the exam window opens</p>
        </div>

        {/* Start time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
          <div className="flex items-center gap-2">
            <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className={selectCls}>
              <option value="">HH</option>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-gray-400 font-medium">:</span>
            <select value={startMinute} onChange={(e) => setStartMinute(e.target.value)} className={selectCls}>
              <option value="">MM</option>
              {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button type="button" onClick={() => setStartPeriod('AM')} className={periodCls(startPeriod === 'AM')}>AM</button>
              <button type="button" onClick={() => setStartPeriod('PM')} className={periodCls(startPeriod === 'PM')}>PM</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">When the exam window opens for employees</p>
        </div>

        {/* End time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
          <div className="flex items-center gap-2">
            <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className={selectCls}>
              <option value="">HH</option>
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-gray-400 font-medium">:</span>
            <select value={endMinute} onChange={(e) => setEndMinute(e.target.value)} className={selectCls}>
              <option value="">MM</option>
              {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button type="button" onClick={() => setEndPeriod('AM')} className={periodCls(endPeriod === 'AM')}>AM</button>
              <button type="button" onClick={() => setEndPeriod('PM')} className={periodCls(endPeriod === 'PM')}>PM</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">End time must be after start time</p>
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
