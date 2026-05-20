'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../../lib/api'
import { formatDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import Badge from '../../../components/ui/Badge'
import Notification from '../../../components/ui/Notification'

interface Folder {
  id: string
  name: string
  created_at: string
}

interface Resource {
  id: string
  title: string
  description: string | null
  url: string
  category: string | null
  folder_id: string | null
  created_at: string
}

const BLANK = { title: '', url: '', description: '', category: '', folder_id: '', newFolderName: '' }

export default function ResourcesPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [creatingNewFolder, setCreatingNewFolder] = useState(false)

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/resources')
      return res.data.resources
    },
  })

  const { data: folders } = useQuery<Folder[]>({
    queryKey: ['admin-resource-folders'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/resource-folders')
      return res.data.folders
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await adminApi.post('/admin/resource-folders', { name })
      return res.data.folder as Folder
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resource-folders'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; url: string; description: string; category: string; folder_id: string | null }) => {
      await adminApi.post('/admin/resources', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resources'] })
      setForm(BLANK)
      setCreatingNewFolder(false)
      setNotification({ msg: 'Resource added', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to add resource', type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApi.delete(`/admin/resources/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resources'] })
      setNotification({ msg: 'Resource deleted', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to delete', type: 'error' }),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApi.delete(`/admin/resource-folders/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resource-folders'] })
      setNotification({ msg: 'Folder deleted', type: 'success' })
    },
    onError: (e: any) => {
      const msg = e.response?.data?.error || 'Failed to delete folder'
      setNotification({ msg, type: 'error' })
    },
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title required'
    if (!form.url.trim()) e.url = 'URL required'
    else {
      try { new URL(form.url) } catch { e.url = 'Invalid URL' }
    }
    if (creatingNewFolder && !form.newFolderName.trim()) e.newFolderName = 'Folder name required'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    let folderId: string | null = form.folder_id || null

    if (creatingNewFolder && form.newFolderName.trim()) {
      const newFolder = await createFolderMutation.mutateAsync(form.newFolderName.trim())
      folderId = newFolder.id
    }

    createMutation.mutate({
      title: form.title,
      url: form.url,
      description: form.description,
      category: form.category,
      folder_id: folderId,
    })
  }

  // Group resources by folder for display
  const resourcesByFolder = (resources ?? []).reduce<Record<string, Resource[]>>((acc, r) => {
    const key = r.folder_id || '__none__'
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const uncategorized = resourcesByFolder['__none__'] || []

  const inputStyle = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Save to folder</label>
                <select
                  value={creatingNewFolder ? '__new__' : form.folder_id}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setCreatingNewFolder(true)
                      setForm((f) => ({ ...f, folder_id: '' }))
                    } else {
                      setCreatingNewFolder(false)
                      setForm((f) => ({ ...f, folder_id: e.target.value, newFolderName: '' }))
                    }
                  }}
                  className={inputStyle}
                >
                  <option value="">No folder (uncategorized)</option>
                  {(folders ?? []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                  <option value="__new__">+ Create new folder</option>
                </select>

                {creatingNewFolder && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={form.newFolderName}
                      onChange={(e) => setForm((f) => ({ ...f, newFolderName: e.target.value }))}
                      placeholder="Folder name..."
                      className={inputStyle}
                    />
                    {errors.newFolderName && (
                      <p className="text-xs text-red-600 mt-1">{errors.newFolderName}</p>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" loading={createMutation.isPending || createFolderMutation.isPending}>
                Add Resource
              </Button>
            </form>
          </div>
        </div>

        {/* List grouped by folder */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400 text-sm">Loading...</div>
          ) : !resources?.length ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400 text-sm">No resources yet.</div>
          ) : (
            <>
              {(folders ?? []).map((folder) => {
                const folderResources = resourcesByFolder[folder.id] || []
                return (
                  <div key={folder.id} className="bg-white rounded-xl border border-gray-200">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📁</span>
                        <h3 className="font-medium text-gray-900 text-sm">{folder.name}</h3>
                        <span className="text-xs text-gray-400">{folderResources.length} file{folderResources.length !== 1 ? 's' : ''}</span>
                      </div>
                      {folderResources.length === 0 && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete folder "${folder.name}"?`)) deleteFolderMutation.mutate(folder.id)
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete folder
                        </button>
                      )}
                    </div>
                    {folderResources.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-400">Empty folder</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {folderResources.map((r) => (
                          <ResourceRow key={r.id} r={r} onDelete={() => {
                            if (confirm('Delete this resource?')) deleteMutation.mutate(r.id)
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {uncategorized.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="font-medium text-gray-500 text-sm">Uncategorized</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {uncategorized.map((r) => (
                      <ResourceRow key={r.id} r={r} onDelete={() => {
                        if (confirm('Delete this resource?')) deleteMutation.mutate(r.id)
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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

function ResourceRow({ r, onDelete }: { r: Resource; onDelete: () => void }) {
  return (
    <div className="px-5 py-4 flex items-start gap-4">
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
        onClick={onDelete}
        className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
      >
        Delete
      </button>
    </div>
  )
}
