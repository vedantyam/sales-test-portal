'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../../lib/api'
import { formatDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Input from '../../../components/ui/Input'
import Notification from '../../../components/ui/Notification'
import { cn } from '../../../lib/utils'

interface TestSummary {
  test_id: string
  title: string
  total_submitted: number
  pending_count: number
  last_submission: string
}

interface EmployeeAnswer {
  question_id: string
  question_text: string
  question_type: 'mcq' | 'subjective'
  marks: number
  answer: string | null
  correct_answer?: string
  is_correct?: boolean
  awarded_marks: number | null
  employee_explanation?: string
}

interface EmployeeResult {
  employee_id: string
  employee_name: string
  department: string
  email: string
  result_id: string | null
  mcq_score: number | null
  subjective_scores: Record<string, number>
  total_score: number | null
  max_score: number | null
  pass_fail: 'pass' | 'fail' | null
  is_finalised: boolean
  is_released: boolean
  submitted_at: string
  tab_switch_count: number
  answers: EmployeeAnswer[]
}

function passBadge(val: 'pass' | 'fail' | null) {
  if (!val) return <Badge variant="gray">Pending</Badge>
  return <Badge variant={val === 'pass' ? 'green' : 'red'}>{val === 'pass' ? 'Pass' : 'Fail'}</Badge>
}

export default function ResultsPage() {
  const qc = useQueryClient()
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [selectedTestTitle, setSelectedTestTitle] = useState('')
  const [search, setSearch] = useState('')
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const { data: testsData, isLoading: loadingTests } = useQuery<{ tests: TestSummary[] }>({
    queryKey: ['results-by-test'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/results/by-test')
      return res.data
    },
  })

  const { data: testDetail, isLoading: loadingDetail } = useQuery<{ employees: EmployeeResult[] }>({
    queryKey: ['results-by-test-detail', selectedTestId],
    queryFn: async () => {
      const res = await adminApi.get(`/admin/results/by-test/${selectedTestId}`)
      return res.data
    },
    enabled: !!selectedTestId,
  })

  const tests = testsData?.tests ?? []
  const employees = testDetail?.employees ?? []
  const allFinalised = employees.length > 0 && employees.every(e => e.is_finalised)
  const allReleased = employees.length > 0 && employees.every(e => e.is_released)

  const filteredTests = tests.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const scoreMutation = useMutation({
    mutationFn: async ({ resultId, questionId, marks }: { resultId: string; questionId: string; marks: number }) => {
      await adminApi.patch(`/admin/results/${resultId}/score`, { question_id: questionId, marks })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['results-by-test-detail', selectedTestId] })
      setNotification({ msg: 'Score saved', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to save score', type: 'error' }),
  })

  const finaliseMutation = useMutation({
    mutationFn: async (resultId: string) => {
      await adminApi.post(`/admin/results/${resultId}/finalise`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['results-by-test'] })
      qc.invalidateQueries({ queryKey: ['results-by-test-detail', selectedTestId] })
      setNotification({ msg: 'Result finalised', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to finalise', type: 'error' }),
  })

  const releaseMutation = useMutation({
    mutationFn: async (testId: string) => {
      const res = await adminApi.post(`/admin/results/release/${testId}`)
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['results-by-test'] })
      qc.invalidateQueries({ queryKey: ['results-by-test-detail', selectedTestId] })
      setNotification({ msg: `Released results for ${data.released_count} employee(s)`, type: 'success' })
    },
    onError: (e: any) => {
      setNotification({ msg: e.response?.data?.error || 'Failed to release', type: 'error' })
    },
  })

  async function handleExport(testId: string, testTitle: string) {
    try {
      const response = await adminApi.get(`/admin/results/export/${testId}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${testTitle.replace(/[^a-zA-Z0-9]/g, '_')}_answers.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e.response?.data?.error || 'Export failed')
    }
  }

  async function handleImportScores(e: React.ChangeEvent<HTMLInputElement>, testId: string) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('test_id', testId)

      const res = await adminApi.post('/admin/results/import-scores', formData)
      setImportResult(res.data)
      qc.invalidateQueries({ queryKey: ['results-by-test'] })
      qc.invalidateQueries({ queryKey: ['results-by-test-detail', testId] })
    } catch (err: any) {
      setImportResult({ error: err.response?.data?.error || 'Import failed' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  function setScore(resultId: string, questionId: string, val: string) {
    const n = parseFloat(val)
    if (!isNaN(n)) {
      setScores(prev => ({
        ...prev,
        [resultId]: { ...(prev[resultId] || {}), [questionId]: n },
      }))
    }
  }

  function saveScore(resultId: string, questionId: string, maxMarks: number) {
    const val = scores[resultId]?.[questionId]
    if (val === undefined) return
    scoreMutation.mutate({ resultId, questionId, marks: Math.min(Math.max(0, val), maxMarks) })
  }

  function toggleExpand(employeeId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Left: test list */}
      <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <h1 className="text-sm font-bold text-gray-900 mb-2">Results</h1>
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loadingTests ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : filteredTests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-4 text-center">
            No submissions yet
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredTests.map(t => (
              <button
                key={t.test_id}
                onClick={() => {
                  setSelectedTestId(t.test_id)
                  setSelectedTestTitle(t.title)
                  setImportResult(null)
                  setExpanded(new Set())
                }}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                  selectedTestId === t.test_id && 'bg-blue-50'
                )}
              >
                <p className="font-medium text-sm text-gray-900 leading-snug">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.last_submission)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{t.total_submitted} submitted</span>
                  {t.pending_count > 0 && (
                    <span className="text-xs text-amber-600">{t.pending_count} pending</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: employees for selected test */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {!selectedTestId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a test to review results
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedTestTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {employees.length} employee{employees.length !== 1 ? 's' : ''} ·{' '}
                    {employees.filter(e => e.is_finalised).length}/{employees.length} finalised
                    {allReleased && ' · All released ✓'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleExport(selectedTestId, selectedTestTitle)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    📥 Export all answers
                  </button>
                  <label className="cursor-pointer text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    {importing ? 'Importing...' : '📤 Import scores'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={e => handleImportScores(e, selectedTestId)}
                      className="hidden"
                      disabled={importing}
                    />
                  </label>
                </div>
              </div>
              {importResult && (
                <div className="mt-2 text-xs px-3 py-2 rounded-lg bg-gray-50">
                  {importResult.error ? (
                    <span className="text-red-600">Error: {importResult.error}</span>
                  ) : (
                    <span className="text-green-700">
                      Import done — {importResult.summary?.employees_updated} updated,{' '}
                      {importResult.summary?.employees_auto_finalised} auto-finalised
                      {importResult.warnings?.length > 0 && ` · ${importResult.warnings.length} warning(s)`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Employee cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {employees.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No submissions for this test</p>
              ) : (
                employees.map(emp => {
                  const subjectiveAnswers = emp.answers.filter(a => a.question_type === 'subjective')
                  const mcqAnswers = emp.answers.filter(a => a.question_type === 'mcq')
                  const allSubjectiveScored = subjectiveAnswers.length === 0 ||
                    subjectiveAnswers.every(a => emp.subjective_scores[a.question_id] != null)
                  const canFinalise = !emp.is_finalised && emp.result_id !== null && allSubjectiveScored
                  const isExpanded = expanded.has(emp.employee_id)

                  return (
                    <div key={emp.employee_id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Employee summary row */}
                      <div
                        className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleExpand(emp.employee_id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-gray-900">{emp.employee_name}</p>
                            <span className="text-xs text-gray-500">{emp.department}</span>
                            {passBadge(emp.pass_fail)}
                            {emp.is_finalised && <span className="text-xs text-green-600 font-medium">Finalised</span>}
                            {emp.is_released && <span className="text-xs text-blue-600 font-medium">Released</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span>MCQ: <strong className="text-gray-700">{emp.mcq_score ?? '—'}</strong></span>
                            {emp.total_score !== null && (
                              <span>Total: <strong className="text-gray-700">{emp.total_score}/{emp.max_score}</strong></span>
                            )}
                            {emp.tab_switch_count > 0 && (
                              <span className="text-amber-600">{emp.tab_switch_count} tab switch{emp.tab_switch_count !== 1 ? 'es' : ''}</span>
                            )}
                            {emp.submitted_at && <span className="text-gray-400">{formatDate(emp.submitted_at)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!emp.is_finalised && emp.result_id && (
                            <Button
                              size="sm"
                              disabled={!canFinalise || finaliseMutation.isPending}
                              title={!allSubjectiveScored ? 'Score all subjective questions first' : undefined}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Finalise result for ${emp.employee_name}?`)) {
                                  finaliseMutation.mutate(emp.result_id!)
                                }
                              }}
                            >
                              Finalise
                            </Button>
                          )}
                          <svg
                            className={cn('w-4 h-4 text-gray-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded answers + scoring */}
                      {isExpanded && (
                        <div className="p-4 space-y-4">
                          {/* MCQ answers */}
                          {mcqAnswers.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                MCQ — {mcqAnswers.filter(a => a.is_correct).length}/{mcqAnswers.length} correct
                              </p>
                              <div className="space-y-2">
                                {mcqAnswers.map((ans, i) => (
                                  <div key={ans.question_id} className="text-xs bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                                    <p className="text-gray-700 font-medium">Q{i + 1}. {ans.question_text}</p>
                                    <div className="flex items-center gap-4">
                                      <span className={cn(
                                        'font-medium',
                                        ans.is_correct ? 'text-green-600' : 'text-red-500'
                                      )}>
                                        {ans.answer || <em className="font-normal text-gray-400">Not answered</em>}
                                        {ans.is_correct ? ' ✓' : ' ✗'}
                                      </span>
                                      {!ans.is_correct && ans.correct_answer && (
                                        <span className="text-green-600">Correct: {ans.correct_answer}</span>
                                      )}
                                    </div>
                                    {ans.employee_explanation && (
                                      <p className="text-blue-600">Reasoning: {ans.employee_explanation}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Subjective scoring */}
                          {subjectiveAnswers.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Subjective — {subjectiveAnswers.length} question{subjectiveAnswers.length !== 1 ? 's' : ''}
                              </p>
                              <div className="space-y-3">
                                {subjectiveAnswers.map((ans) => {
                                  const savedScore = emp.subjective_scores[ans.question_id]
                                  const pendingScore = scores[emp.result_id ?? '']?.[ans.question_id]
                                  const displayScore = pendingScore ?? savedScore

                                  return (
                                    <div key={ans.question_id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                                      <p className="text-sm font-medium text-gray-800">{ans.question_text}</p>
                                      <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 min-h-[2.5rem] whitespace-pre-wrap">
                                        {ans.answer || <em className="text-gray-400">No answer provided</em>}
                                      </div>
                                      {emp.is_finalised ? (
                                        <p className="text-xs text-gray-500">
                                          Awarded: <strong>{savedScore ?? '—'}</strong> / {ans.marks}
                                        </p>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">Marks:</span>
                                          <input
                                            type="number"
                                            min={0}
                                            max={ans.marks}
                                            step={0.5}
                                            value={displayScore ?? ''}
                                            onChange={e => emp.result_id && setScore(emp.result_id, ans.question_id, e.target.value)}
                                            className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <span className="text-xs text-gray-400">/ {ans.marks}</span>
                                          <button
                                            onClick={() => emp.result_id && saveScore(emp.result_id, ans.question_id, ans.marks)}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            Save
                                          </button>
                                          {savedScore != null && (
                                            <span className="text-xs text-green-600">Saved: {savedScore}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Release footer */}
            {employees.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                {allReleased ? (
                  <p className="text-center text-sm text-green-600 font-medium">All results released ✓</p>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!allFinalised || releaseMutation.isPending}
                    title={!allFinalised ? 'Finalise all employee results first' : undefined}
                    onClick={() => {
                      if (confirm(`Release results for all ${employees.length} employee(s) in this test?`)) {
                        releaseMutation.mutate(selectedTestId)
                      }
                    }}
                    loading={releaseMutation.isPending}
                  >
                    Release results for all {employees.length} employee{employees.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
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
