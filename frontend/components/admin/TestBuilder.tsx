'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { generateId } from '../../lib/utils'
import { adminApi } from '../../lib/api'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'

interface Option {
  id: string
  text: string
}

interface Question {
  id: string
  type: 'mcq' | 'subjective'
  text: string
  options: Option[]
  correct_answer: string
  explanation: string
  marks: number
  word_limit: number | ''
  expected_answer?: string
}

interface Section {
  id: string
  title: string
  questions: Question[]
}

interface TestBuilderProps {
  initialData?: {
    title: string
    description: string
    duration_minutes: number
    sections: Section[]
  }
  onSave: (data: {
    title: string
    description: string
    duration_minutes: number
    sections: Section[]
  }) => Promise<void>
  onCancel: () => void
}

function newQuestion(): Question {
  return {
    id: generateId(),
    type: 'mcq',
    text: '',
    options: [
      { id: generateId(), text: '' },
      { id: generateId(), text: '' },
      { id: generateId(), text: '' },
      { id: generateId(), text: '' },
    ],
    correct_answer: '',
    explanation: '',
    marks: 1,
    word_limit: '',
  }
}

function newSection(): Section {
  return { id: generateId(), title: 'Section 1', questions: [newQuestion()] }
}

// Sortable section row handle
function SortableSectionHandle({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  )
}

function SortableQuestionHandle({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="border border-gray-200 rounded-lg p-4 bg-white mb-3"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

export default function TestBuilder({ initialData, onSave, onCancel }: TestBuilderProps) {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [sections, setSections] = useState<Section[]>(initialData?.sections ?? [newSection()])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // --- Section helpers ---
  function addSection() {
    const n = newSection()
    n.title = `Section ${sections.length + 1}`
    setSections((prev) => [...prev, n])
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  function updateSectionTitle(id: string, title: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
  }

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSections((prev) => {
        const oldIdx = prev.findIndex((s) => s.id === active.id)
        const newIdx = prev.findIndex((s) => s.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  // --- Question helpers ---
  function addQuestion(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, questions: [...s.questions, newQuestion()] } : s
      )
    )
  }

  function removeQuestion(sectionId: string, questionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s
      )
    )
  }

  function updateQuestion(sectionId: string, questionId: string, patch: Partial<Question>) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...patch } : q
              ),
            }
          : s
      )
    )
  }

  function handleQuestionDragEnd(sectionId: string, event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s
          const oldIdx = s.questions.findIndex((q) => q.id === active.id)
          const newIdx = s.questions.findIndex((q) => q.id === over.id)
          return { ...s, questions: arrayMove(s.questions, oldIdx, newIdx) }
        })
      )
    }
  }

  function updateOption(sectionId: string, questionId: string, optionId: string, text: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId
                  ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, text } : o)) }
                  : q
              ),
            }
          : s
      )
    )
  }

  // --- Validation ---
  function validateStep1() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    return e
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    sections.forEach((sec, si) => {
      if (!sec.title.trim()) e[`sec_${si}_title`] = `Section ${si + 1}: title required`
      if (sec.questions.length === 0) e[`sec_${si}_questions`] = `Section ${si + 1}: add at least one question`
      sec.questions.forEach((q, qi) => {
        if (!q.text.trim()) e[`q_${q.id}_text`] = `Section ${si + 1} Q${qi + 1}: text required`
        if (q.marks < 1) e[`q_${q.id}_marks`] = `Section ${si + 1} Q${qi + 1}: marks must be >= 1`
        if (q.type === 'mcq') {
          if (q.options.some((o) => !o.text.trim())) {
            e[`q_${q.id}_options`] = `Section ${si + 1} Q${qi + 1}: all option texts required`
          }
          if (!q.correct_answer) {
            e[`q_${q.id}_answer`] = `Section ${si + 1} Q${qi + 1}: select correct answer`
          }
        }
      })
    })
    return e
  }

  function goToStep2() {
    const e = validateStep1()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep(2)
  }

  function goToStep3() {
    const e = validateStep2()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep(3)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportErrors([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await adminApi.post('/admin/tests/import', formData)
      const { sections: imported, errors: warnings, summary } = res.data

      const converted: Section[] = imported.map((s: any) => ({
        id: s.id,
        title: s.name,
        questions: s.questions.map((q: any) => ({
          id: q.id,
          type: q.type as 'mcq' | 'subjective',
          text: q.text,
          options: q.options ?? [],
          correct_answer: q.correct_answer ?? '',
          explanation: '',
          marks: q.marks,
          word_limit: '' as '' | number,
          expected_answer: q.expected_answer,
        })),
      }))

      setSections(converted)

      if (warnings.length > 0) {
        setImportErrors(warnings)
      }

      alert(`Imported: ${summary.section_count} sections, ${summary.question_count} questions (${summary.mcq_count} MCQ, ${summary.subjective_count} Subjective)`)
    } catch (err: any) {
      const msg = err.response?.data?.errors?.join(', ') || err.response?.data?.error || err.message || 'Import failed'
      setImportErrors([msg])
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ title, description, duration_minutes: 60, sections })
    } finally {
      setSaving(false)
    }
  }

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const totalMarks = sections.reduce(
    (s, sec) => s + sec.questions.reduce((ss, q) => ss + (q.marks || 0), 0),
    0
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s < step
                  ? 'bg-green-500 text-white'
                  : s === step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            <span className={`text-sm font-medium ${s === step ? 'text-blue-600' : 'text-gray-400'}`}>
              {s === 1 ? 'Basic Info' : s === 2 ? 'Questions' : 'Review'}
            </span>
            {s < 3 && <div className="w-12 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-5">
          <Input
            label="Test Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="e.g. Q2 Sales Knowledge Assessment"
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of the test..."
          />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button onClick={goToStep2}>Next: Add Questions</Button>
          </div>
        </div>
      )}

      {/* Step 2: Sections & Questions */}
      {step === 2 && (
        <div>
          <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Import questions from Excel file</p>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
                {importing ? 'Importing...' : '📥 Import from Excel'}
                <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" disabled={importing} />
              </label>
              <a href="/exam-template.xlsx" download className="text-xs text-gray-400 underline">
                Download template
              </a>
            </div>
            {importErrors.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {importErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">⚠ {e}</p>
                ))}
              </div>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((sec, si) => (
                <SortableSectionHandle key={sec.id} id={sec.id}>
                  <div className="flex-1 border border-gray-300 rounded-xl p-5 mb-4 bg-gray-50">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        className="flex-1 font-semibold text-base bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1"
                        value={sec.title}
                        onChange={(e) => updateSectionTitle(sec.id, e.target.value)}
                        placeholder="Section title"
                      />
                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(sec.id)}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleQuestionDragEnd(sec.id, e)}
                    >
                      <SortableContext items={sec.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                        {sec.questions.map((q, qi) => (
                          <SortableQuestionHandle key={q.id} id={q.id}>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-gray-500 flex-shrink-0">Q{qi + 1}</span>
                                <select
                                  value={q.type}
                                  onChange={(e) =>
                                    updateQuestion(sec.id, q.id, {
                                      type: e.target.value as 'mcq' | 'subjective',
                                      correct_answer: '',
                                    })
                                  }
                                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="mcq">MCQ</option>
                                  <option value="subjective">Subjective</option>
                                </select>
                                <input
                                  type="number"
                                  value={q.marks}
                                  onChange={(e) =>
                                    updateQuestion(sec.id, q.id, { marks: parseInt(e.target.value) || 1 })
                                  }
                                  min={1}
                                  className="w-20 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Marks"
                                />
                                {sec.questions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeQuestion(sec.id, q.id)}
                                    className="ml-auto text-red-400 hover:text-red-600 text-xs"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <textarea
                                value={q.text}
                                onChange={(e) => updateQuestion(sec.id, q.id, { text: e.target.value })}
                                placeholder="Question text..."
                                rows={2}
                                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />

                              {q.type === 'mcq' && (
                                <div className="space-y-2">
                                  {q.options.map((opt) => (
                                    <div key={opt.id} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`correct_${q.id}`}
                                        checked={q.correct_answer === opt.id}
                                        onChange={() => updateQuestion(sec.id, q.id, { correct_answer: opt.id })}
                                        className="text-blue-600 focus:ring-blue-500"
                                      />
                                      <input
                                        value={opt.text}
                                        onChange={(e) => updateOption(sec.id, q.id, opt.id, e.target.value)}
                                        placeholder={`Option text...`}
                                        className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>
                                  ))}
                                  <p className="text-xs text-gray-400">Select the radio button next to the correct answer</p>
                                </div>
                              )}

                              {q.type === 'subjective' && (
                                <input
                                  type="number"
                                  value={q.word_limit}
                                  onChange={(e) =>
                                    updateQuestion(sec.id, q.id, {
                                      word_limit: e.target.value ? parseInt(e.target.value) : '',
                                    })
                                  }
                                  placeholder="Word limit (optional)"
                                  min={1}
                                  className="w-40 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}

                              <input
                                value={q.explanation}
                                onChange={(e) => updateQuestion(sec.id, q.id, { explanation: e.target.value })}
                                placeholder="Explanation (optional, shown after scoring)"
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />

                              {Object.keys(errors)
                                .filter((k) => k.startsWith(`q_${q.id}_`))
                                .map((k) => (
                                  <p key={k} className="text-xs text-red-600">{errors[k]}</p>
                                ))}
                            </div>
                          </SortableQuestionHandle>
                        ))}
                      </SortableContext>
                    </DndContext>

                    <button
                      type="button"
                      onClick={() => addQuestion(sec.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                    >
                      + Add Question
                    </button>
                  </div>
                </SortableSectionHandle>
              ))}
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addSection}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors font-medium"
          >
            + Add Section
          </button>

          {Object.keys(errors).some((k) => k.startsWith('sec_')) && (
            <div className="mt-3 space-y-1">
              {Object.entries(errors)
                .filter(([k]) => k.startsWith('sec_'))
                .map(([k, v]) => <p key={k} className="text-xs text-red-600">{v}</p>)}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={goToStep3}>Next: Review</Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-600">{description}</p>}
            <div className="flex gap-6 text-sm text-gray-500">
              <span><strong className="text-gray-800">{sections.length}</strong> section{sections.length !== 1 ? 's' : ''}</span>
              <span><strong className="text-gray-800">{totalQuestions}</strong> question{totalQuestions !== 1 ? 's' : ''}</span>
              <span><strong className="text-gray-800">{totalMarks}</strong> marks</span>
            </div>
          </div>

          {sections.map((sec, si) => (
            <div key={sec.id} className="border border-gray-200 rounded-xl p-5">
              <h4 className="font-medium text-gray-900 mb-3">
                {si + 1}. {sec.title}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({sec.questions.length} question{sec.questions.length !== 1 ? 's' : ''})
                </span>
              </h4>
              <div className="space-y-3">
                {sec.questions.map((q, qi) => (
                  <div key={q.id} className="text-sm">
                    <p className="text-gray-800">
                      <span className="font-medium">Q{qi + 1}.</span> {q.text}
                      <span className="ml-2 text-gray-400">
                        [{q.type.toUpperCase()} · {q.marks}m]
                      </span>
                    </p>
                    {q.type === 'mcq' && (
                      <ul className="ml-6 mt-1 space-y-0.5">
                        {q.options.map((opt) => (
                          <li
                            key={opt.id}
                            className={opt.id === q.correct_answer ? 'text-green-700 font-medium' : 'text-gray-500'}
                          >
                            {opt.id === q.correct_answer ? '✓ ' : '○ '}
                            {opt.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Test</Button>
          </div>
        </div>
      )}
    </div>
  )
}
