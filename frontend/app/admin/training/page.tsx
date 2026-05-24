'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { adminApi } from '../../../lib/api'
import Button from '../../../components/ui/Button'
import Notification from '../../../components/ui/Notification'
import CourseEditor from '../../../components/admin/CourseEditor'

interface CourseRow {
  id: string
  name: string
  description: string | null
  departments: string[]
  order_index: number
  chapter_count: number
  topic_count: number
}

interface ParsedCourse {
  name: string
  description?: string
  departments: string[]
  chapters: { name: string; topics: { name: string; youtube_url?: string; doc_url?: string; notes?: string }[] }[]
}

function isYouTubeUrl(url: string): boolean {
  return /youtu\.be\/|youtube\.com\/(watch|embed)/.test(url)
}

function parseXlsxToCourses(data: unknown[][]): ParsedCourse[] {
  const courseMap = new Map<string, ParsedCourse>()

  for (const row of data) {
    const courseName = String(row[0] ?? '').trim()
    const chapterName = String(row[1] ?? '').trim()
    const topicName = String(row[2] ?? '').trim()
    const youtubeUrl = String(row[3] ?? '').trim()
    const docUrl = String(row[4] ?? '').trim()
    const notes = String(row[5] ?? '').trim()

    if (!courseName || !chapterName || !topicName) continue

    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, { name: courseName, departments: ['Sales', 'Support'], chapters: [] })
    }
    const course = courseMap.get(courseName)!

    let chapter = course.chapters.find((c) => c.name === chapterName)
    if (!chapter) {
      chapter = { name: chapterName, topics: [] }
      course.chapters.push(chapter)
    }

    chapter.topics.push({
      name: topicName,
      youtube_url: youtubeUrl || undefined,
      doc_url: docUrl || undefined,
      notes: notes || undefined,
    })
  }

  return Array.from(courseMap.values())
}

export default function AdminTrainingPage() {
  const qc = useQueryClient()
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [editingCourse, setEditingCourse] = useState<CourseRow | null | 'new'>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<CourseRow | null>(null)
  const [importPreview, setImportPreview] = useState<ParsedCourse[] | null>(null)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery<{ courses: CourseRow[] }>({
    queryKey: ['admin-training'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/training')
      return res.data
    },
  })

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.post('/admin/training/seed')
      return res.data as { message: string; courseCount?: number; topicCount?: number }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-training'] })
      setNotification({ msg: data.message === 'Already seeded' ? 'Already seeded — no changes made.' : `Seeded ${data.courseCount} courses, ${data.topicCount} topics.`, type: 'success' })
    },
    onError: () => setNotification({ msg: 'Seed failed', type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminApi.delete(`/admin/training/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-training'] })
      setDeleteConfirm(null)
      setNotification({ msg: 'Course deleted', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Delete failed', type: 'error' }),
  })

  const importMutation = useMutation({
    mutationFn: async (courses: ParsedCourse[]) => {
      const res = await adminApi.post('/admin/training/import', { courses })
      return res.data as { imported: number }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-training'] })
      setImportPreview(null)
      setNotification({ msg: `Imported ${data.imported} courses`, type: 'success' })
    },
    onError: () => setNotification({ msg: 'Import failed', type: 'error' }),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]
      const dataRows = rows.slice(1).filter((r) => (r as unknown[]).some(Boolean))
      const courses = parseXlsxToCourses(dataRows)

      const warnings: string[] = []
      for (const c of courses) {
        for (const ch of c.chapters) {
          for (const t of ch.topics) {
            if (t.youtube_url && !isYouTubeUrl(t.youtube_url)) {
              warnings.push(`"${t.name}": URL doesn't look like a YouTube link`)
            }
          }
        }
      }

      setImportWarnings(warnings)
      setImportPreview(courses)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const headers = ['Course Name', 'Chapter Name', 'Topic Name', 'YouTube URL', 'Doc URL', 'Notes']
    const examples = [
      ['Intro Course', 'Chapter 1', 'Welcome Video', 'https://youtu.be/abc123', '', 'Start here'],
      ['Intro Course', 'Chapter 1', 'Deep Dive', 'https://youtu.be/xyz456', 'https://docs.example.com', ''],
      ['Intro Course', 'Chapter 2', 'Advanced Topics', '', 'https://docs.example.com/advanced', 'Optional reading'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])
    const instrWs = XLSX.utils.aoa_to_sheet([
      ['Instructions'],
      [''],
      ['Each row = one topic. Rows with the same Course Name + Chapter Name are grouped together.'],
      ['YouTube URL: paste the full YouTube link (youtu.be/... or youtube.com/watch?v=...).'],
      ['Doc URL: optional link to a resource document.'],
      ['Notes: optional text shown below the video.'],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Training Data')
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions')
    XLSX.writeFile(wb, 'training_template.xlsx')
  }

  if (editingCourse !== null) {
    return (
      <CourseEditor
        course={editingCourse === 'new' ? null : editingCourse}
        onClose={() => setEditingCourse(null)}
        onSaved={() => {
          setEditingCourse(null)
          qc.invalidateQueries({ queryKey: ['admin-training'] })
          setNotification({ msg: 'Course saved', type: 'success' })
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Training</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            Download Template
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Import from Excel
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <Button
            variant="secondary"
            size="sm"
            loading={seedMutation.isPending}
            onClick={() => seedMutation.mutate()}
          >
            Run Seed
          </Button>
          <Button size="sm" onClick={() => setEditingCourse('new')}>
            + Create Course
          </Button>
        </div>
      </div>

      {importPreview && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Import Preview</h2>
          {importWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-amber-700">Warnings (import still allowed):</p>
              {importWarnings.map((w, i) => <p key={i} className="text-xs text-amber-600">{w}</p>)}
            </div>
          )}
          <div className="space-y-2">
            {importPreview.map((c, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <p className="font-medium text-sm text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.chapters.length} chapters · {c.chapters.reduce((s, ch) => s + ch.topics.length, 0)} topics</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" loading={importMutation.isPending} onClick={() => importMutation.mutate(importPreview)}>
              Confirm Import
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setImportPreview(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : !data?.courses?.length ? (
          <div className="text-center py-16 text-gray-400 text-sm">No courses yet. Create one or run the seed.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Course Name</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Chapters</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Topics</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Departments</th>
                <th className="px-5 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-4 text-gray-600">{c.chapter_count}</td>
                  <td className="px-5 py-4 text-gray-600">{c.topic_count}</td>
                  <td className="px-5 py-4 text-gray-600">{c.departments.join(', ')}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingCourse(c)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(c)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="font-semibold text-gray-900">Delete Course?</h2>
            <p className="text-sm text-gray-600">
              Delete <strong>{deleteConfirm.name}</strong>? This will also delete all chapters, topics, and employee progress. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              >
                Delete
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <Notification message={notification.msg} type={notification.type} onDismiss={() => setNotification(null)} />
      )}
    </div>
  )
}
