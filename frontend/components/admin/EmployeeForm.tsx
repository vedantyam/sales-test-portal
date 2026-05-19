'use client'

import { useState, useEffect } from 'react'
import { Employee } from '../../types'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { cn } from '../../lib/utils'

interface EmployeeFormProps {
  open: boolean
  employee?: Employee | null
  onClose: () => void
  onSave: (data: { name: string; email: string; department: string }) => Promise<void>
}

export default function EmployeeForm({ open, employee, onClose, onSave }: EmployeeFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (employee) {
      setName(employee.name)
      setEmail(employee.email)
      setDepartment(employee.department)
    } else {
      setName('')
      setEmail('')
      setDepartment('')
    }
    setErrors({})
  }, [employee, open])

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email'
    if (!department.trim()) e.department = 'Department is required'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await onSave({ name: name.trim(), email: email.trim(), department: department.trim() })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-40 w-96 bg-white shadow-2xl transform transition-transform duration-300 flex flex-col',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {employee ? 'Edit Employee' : 'Add Employee'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="John Doe"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="john@company.com"
          disabled={!!employee}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
          >
            <option value="">Select department</option>
            <option value="Sales">Sales</option>
            <option value="Support">Support</option>
          </select>
          {errors.department && <p className="text-xs text-red-600 mt-1">{errors.department}</p>}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {employee ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}
