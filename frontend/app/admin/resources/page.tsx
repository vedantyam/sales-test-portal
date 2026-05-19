'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import { Resource } from '../../../types'
import { formatDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import Badge from '../../../components/ui/Badge'
import Notification from '../../../components/ui/Notification'

const BLANK = { title: '', url: '', description: '', category: '' }

export default function ResourcesPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const res = await api.get('/admin/resources')
      return res.data.resources
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof BLANK) => {
      await api.post('/admin/resources', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resources'] })
      setForm(BLANK)
      setNotification({ msg: 'Resource added', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to add resource', type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/resources/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resources'] })
      setNotification({ msg: 'Resource deleted', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to delete', type: 'error' }),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title required'
    if (!form.url.trim()) e.url = 'URL required'
    else {
      try { new URL(form.url) } catch { e.url = 'Invalid URL' }
    }
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Resources</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Add Resource</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                error={errors.title}
                placeholder="React Documentation"
              />
              <Input
                label="URL"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                error={errors.url}
                placeholder="https://..."
              />
              <Textarea
                label="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Brief description..."
              />
              <Input
                label="Category (optional)"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Documentation, Video, etc."
              />
              <Button type="submit" className="w-full" loading={createMutation.isPending}>
                Add Resource
              </Button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            {isLoading ? (
              <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
            ) : !resources?.length ? (
              <div className="text-center py-16 text-gray-400 text-sm">No resources yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {resources.map((r) => (
                  <div key={r.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate"
                        >
                          {r.title}
                        </a>
                        {r.category && <Badge variant="gray">{r.category}</Badge>}
                      </div>
                      {r.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{r.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 truncate">{r.url}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Delete this resource?')) deleteMutation.mutate(r.id)
                      }}
                      className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
