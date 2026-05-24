'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { adminApi } from '../../lib/api'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'

interface CourseRow {
  id: string
  name: string
  description: string | null
  departments: string[]
  order_index: number
}

interface TopicDraft {
  _id: string
  name: string
  youtube_url: string
  doc_url: string
  notes: string
  expanded: boolean
}

interface ChapterDraft {
  _id: string
  name: string
  topics: TopicDraft[]
  expanded: boolean
}

interface CourseEditorProps {
  course: CourseRow | null
  onClose: () => void
  onSaved: () => void
}

let _counter = 0
function uid() { return `draft-${++_counter}` }

function newTopic(): TopicDraft {
  return { _id: uid(), name: '', youtube_url: '', doc_url: '', notes: '', expanded: true }
}

function newChapter(): ChapterDraft {
  return { _id: uid(), name: '', topics: [], expanded: true }
}

function SortableChapter({
  chapter,
  onUpdateName,
  onToggle,
  onDelete,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
}: {
  chapter: ChapterDraft
  onUpdateName: (name: string) => void
  onToggle: () => void
  onDelete: () => void
  onAddTopic: () => void
  onUpdateTopic: (topicId: string, field: keyof TopicDraft, value: string | boolean) => void
  onDeleteTopic: (topicId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: chapter._id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-gray-600 flex-shrink-0"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm6-12a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" />
          </svg>
        </button>
        <input
          className="flex-1 text-sm font-medium bg-transparent border-0 outline-none focus:outline-none text-gray-900 placeholder-gray-400"
          placeholder="Chapter name..."
          value={chapter.name}
          onChange={(e) => onUpdateName(e.target.value)}
        />
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 p-1">
          <svg className={`w-4 h-4 transition-transform ${chapter.expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {chapter.expanded && (
        <div className="divide-y divide-gray-100">
          {chapter.topics.map((topic) => (
            <SortableTopic
              key={topic._id}
              topic={topic}
              onUpdate={(field, value) => onUpdateTopic(topic._id, field, value)}
              onDelete={() => onDeleteTopic(topic._id)}
            />
          ))}
          <div className="px-4 py-3">
            <button
              onClick={onAddTopic}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Topic
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableTopic({
  topic,
  onUpdate,
  onDelete,
}: {
  topic: TopicDraft
  onUpdate: (field: keyof TopicDraft, value: string | boolean) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: topic._id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm6-12a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm0 6a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" />
          </svg>
        </button>
        <input
          className="flex-1 text-sm border-0 border-b border-gray-200 outline-none focus:border-blue-400 bg-transparent py-1 placeholder-gray-400"
          placeholder="Topic name..."
          value={topic.name}
          onChange={(e) => onUpdate('name', e.target.value)}
        />
        <button
          onClick={() => onUpdate('expanded', !topic.expanded)}
          className="text-xs text-gray-400 hover:text-gray-600 px-1"
        >
          {topic.expanded ? 'Less' : 'More'}
        </button>
        <button onClick={onDelete} className="text-red-400 hover:text-red-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {topic.expanded && (
        <div className="pl-5 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
              <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            <input
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 placeholder-gray-400"
              placeholder="YouTube URL (optional)"
              value={topic.youtube_url}
              onChange={(e) => onUpdate('youtube_url', e.target.value)}
            />
          </div>
          <input
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 placeholder-gray-400"
            placeholder="Resource/Doc URL (optional)"
            value={topic.doc_url}
            onChange={(e) => onUpdate('doc_url', e.target.value)}
          />
          <textarea
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 placeholder-gray-400 resize-none"
            placeholder="Notes (optional)"
            rows={2}
            value={topic.notes}
            onChange={(e) => onUpdate('notes', e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

export default function CourseEditor({ course, onClose, onSaved }: CourseEditorProps) {
  const isEdit = !!course

  const [name, setName] = useState(course?.name ?? '')
  const [description, setDescription] = useState(course?.description ?? '')
  const [departments, setDepartments] = useState<string[]>(course?.departments ?? ['Sales', 'Support'])
  const [chapters, setChapters] = useState<ChapterDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!course?.id) return
    adminApi.get(`/admin/training/${course.id}`).then((res) => {
      const data = res.data
      setChapters((data.chapters ?? []).map((ch: { id: string; name: string; topics: { id: string; name: string; youtube_url: string | null; doc_url: string | null; notes: string | null }[] }) => ({
        _id: ch.id,
        name: ch.name,
        expanded: true,
        topics: (ch.topics ?? []).map((t) => ({
          _id: t.id,
          name: t.name,
          youtube_url: t.youtube_url ?? '',
          doc_url: t.doc_url ?? '',
          notes: t.notes ?? '',
          expanded: false,
        })),
      })))
    }).catch(() => {})
  }, [course?.id])

  function toggleDept(d: string) {
    setDepartments((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function addChapter() {
    setChapters((prev) => [...prev, newChapter()])
  }

  function updateChapterName(id: string, n: string) {
    setChapters((prev) => prev.map((c) => c._id === id ? { ...c, name: n } : c))
  }

  function toggleChapter(id: string) {
    setChapters((prev) => prev.map((c) => c._id === id ? { ...c, expanded: !c.expanded } : c))
  }

  function deleteChapter(id: string) {
    setChapters((prev) => prev.filter((c) => c._id !== id))
  }

  function addTopicToChapter(chapterId: string) {
    setChapters((prev) => prev.map((c) => c._id === chapterId ? { ...c, topics: [...c.topics, newTopic()] } : c))
  }

  function updateTopic(chapterId: string, topicId: string, field: keyof TopicDraft, value: string | boolean) {
    setChapters((prev) => prev.map((c) => c._id === chapterId
      ? { ...c, topics: c.topics.map((t) => t._id === topicId ? { ...t, [field]: value } : t) }
      : c
    ))
  }

  function deleteTopic(chapterId: string, topicId: string) {
    setChapters((prev) => prev.map((c) => c._id === chapterId
      ? { ...c, topics: c.topics.filter((t) => t._id !== topicId) }
      : c
    ))
  }

  function handleChapterDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = chapters.findIndex((c) => c._id === active.id)
    const newIdx = chapters.findIndex((c) => c._id === over.id)
    setChapters(arrayMove(chapters, oldIdx, newIdx))
  }

  function handleTopicDragEnd(chapterId: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setChapters((prev) => prev.map((c) => {
      if (c._id !== chapterId) return c
      const oldIdx = c.topics.findIndex((t) => t._id === active.id)
      const newIdx = c.topics.findIndex((t) => t._id === over.id)
      return { ...c, topics: arrayMove(c.topics, oldIdx, newIdx) }
    }))
  }

  async function handleSave() {
    if (!name.trim()) { setError('Course name required'); return }
    if (departments.length === 0) { setError('Select at least one department'); return }
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        departments,
        chapters: chapters.map((c) => ({
          name: c.name,
          topics: c.topics.map((t) => ({
            name: t.name,
            youtube_url: t.youtube_url.trim() || undefined,
            doc_url: t.doc_url.trim() || undefined,
            notes: t.notes.trim() || undefined,
          })),
        })),
      }
      if (isEdit) {
        await adminApi.put(`/admin/training/${course!.id}`, payload)
      } else {
        await adminApi.post('/admin/training', payload)
      }
      onSaved()
    } catch {
      setError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Course' : 'Create Course'}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Course Details</h2>
        <Input
          label="Course Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Flabs Foundational Course"
        />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Brief description..."
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Departments</label>
          <div className="flex gap-4">
            {['Sales', 'Support'].map((d) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={departments.includes(d)}
                  onChange={() => toggleDept(d)}
                  className="rounded border-gray-300 text-blue-600"
                />
                {d}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Content</h2>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChapterDragEnd}>
          <SortableContext items={chapters.map((c) => c._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {chapters.map((chapter) => (
                <DndContext
                  key={chapter._id}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleTopicDragEnd(chapter._id, e)}
                >
                  <SortableContext items={chapter.topics.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                    <SortableChapter
                      chapter={chapter}
                      onUpdateName={(n) => updateChapterName(chapter._id, n)}
                      onToggle={() => toggleChapter(chapter._id)}
                      onDelete={() => deleteChapter(chapter._id)}
                      onAddTopic={() => addTopicToChapter(chapter._id)}
                      onUpdateTopic={(topicId, field, value) => updateTopic(chapter._id, topicId, field, value)}
                      onDeleteTopic={(topicId) => deleteTopic(chapter._id, topicId)}
                    />
                  </SortableContext>
                </DndContext>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          onClick={addChapter}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add Chapter
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pb-8">
        <Button onClick={handleSave} loading={saving}>Save</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}
