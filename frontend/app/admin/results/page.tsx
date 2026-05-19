'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../../lib/api'
import { ResultSummary, ResultDetail } from '../../../types'
import { formatDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Input from '../../../components/ui/Input'
import Notification from '../../../components/ui/Notification'
import { cn } from '../../../lib/utils'

function passBadge(val: 'pass' | 'fail' | null) {
  if (!val) return <Badge variant="gray">Pending</Badge>
  return <Badge variant={val === 'pass' ? 'green' : 'red'}>{val === 'pass' ? 'Pass' : 'Fail'}</Badge>
}

interface EmployeeGroup {
  employee_id: string
  employee_name: string
  employee_department: string
  employee_email: string
  results: ResultSummary[]
}

interface TestGroup {
  testId: string
  testTitle: string
  results: ResultSummary[]
  finalisedCount: number
  releasedCount: number
  allReleased: boolean
  allFinalised: boolean
}

export default function ResultsPage() {
  const qc = useQueryClient()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showRelease, setShowRelease] = useState(false)

  const { data: results, isLoading } = useQuery<ResultSummary[]>({
    queryKey: ['results'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/results')
      return res.data.results
    },
  })

  const releaseMutation = useMutation({
    mutationFn: async (testId: string) => {
      const res = await adminApi.post(`/admin/results/release/${testId}`)
      return res.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['results'] })
      setNotification({ msg: `Released results for ${data.released_count} employee(s)`, type: 'success' })
    },
    onError: (e: any) => {
      const msg = e.response?.data?.error || 'Failed to release results'
      setNotification({ msg, type: 'error' })
    },
  })

  // Group results by employee
  const employeeGroups: EmployeeGroup[] = Object.values(
    (results ?? []).reduce<Record<string, EmployeeGroup>>((acc, r) => {
      if (!acc[r.employee_id]) {
        acc[r.employee_id] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          employee_department: r.employee_department,
          employee_email: r.employee_email,
          results: [],
        }
      }
      acc[r.employee_id].results.push(r)
      return acc
    }, {})
  )

  // Group by test for release panel
  const testGroups: TestGroup[] = Object.values(
    (results ?? []).reduce<Record<string, TestGroup>>((acc, r) => {
      if (!acc[r.test_id]) {
        acc[r.test_id] = {
          testId: r.test_id,
          testTitle: r.test_title,
          results: [],
          finalisedCount: 0,
          releasedCount: 0,
          allReleased: false,
          allFinalised: false,
        }
      }
      acc[r.test_id].results.push(r)
      if (r.is_finalised) acc[r.test_id].finalisedCount++
      if (r.is_released) acc[r.test_id].releasedCount++
      return acc
    }, {})
  ).map((g) => ({
    ...g,
    allFinalised: g.results.length > 0 && g.finalisedCount === g.results.length,
    allReleased: g.results.length > 0 && g.releasedCount === g.results.length,
  }))

  const filteredEmployees = employeeGroups.filter(
    (g) =>
      g.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      g.employee_department.toLowerCase().includes(search.toLowerCase()) ||
      (g.employee_email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const selectedEmployee = employeeGroups.find((g) => g.employee_id === selectedEmployeeId) ?? null

  const { data: detail, isLoading: loadingDetail } = useQuery<ResultDetail>({
    queryKey: ['result-detail', selectedResultId],
    queryFn: async () => {
      const res = await adminApi.get(`/admin/results/${selectedResultId}`)
      return res.data.result
    },
    enabled: !!selectedResultId,
  })

  const scoreMutation = useMutation({
    mutationFn: async ({ resultId, questionId, marks }: { resultId: string; questionId: string; marks: number }) => {
      await adminApi.patch(`/admin/results/${resultId}/score`, { question_id: questionId, marks })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['result-detail', selectedResultId] })
      setNotification({ msg: 'Score saved', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to save score', type: 'error' }),
  })

  const finaliseMutation = useMutation({
    mutationFn: async (resultId: string) => {
      await adminApi.post(`/admin/results/${resultId}/finalise`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['results'] })
      qc.invalidateQueries({ queryKey: ['result-detail', selectedResultId] })
      setNotification({ msg: 'Result finalised and email sent', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to finalise', type: 'error' }),
  })

  function handleScoreChange(questionId: string, val: string) {
    const n = parseFloat(val)
    if (!isNaN(n)) setScores((prev) => ({ ...prev, [questionId]: n }))
  }

  function saveScore(questionId: string, maxMarks: number) {
    if (!selectedResultId || scores[questionId] === undefined) return
    const marks = Math.min(Math.max(0, scores[questionId]), maxMarks)
    scoreMutation.mutate({ resultId: selectedResultId, questionId, marks })
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Left: employee list */}
      <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-gray-900">Results</h1>
            <button
              onClick={() => setShowRelease((v) => !v)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showRelease ? 'Hide' : 'Release'}
            </button>
          </div>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {showRelease && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Release by test</p>
            {testGroups.length === 0 && (
              <p className="text-xs text-gray-400">No results yet.</p>
            )}
            {testGroups.map((g) => (
              <div key={g.testId} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-gray-900 truncate">{g.testTitle}</p>
                <p className="text-xs text-gray-500">
                  {g.finalisedCount}/{g.results.length} finalised
                </p>
                {g.allReleased ? (
                  <span className="text-xs text-green-600 font-medium">All released</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={!g.allFinalised || releaseMutation.isPending}
                    onClick={() => releaseMutation.mutate(g.testId)}
                    className="mt-1 w-full text-xs"
                    title={!g.allFinalised ? 'Finalise all scores first' : undefined}
                  >
                    Release
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No results</div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredEmployees.map((g) => {
              const pending = g.results.filter((r) => !r.is_finalised).length
              return (
                <button
                  key={g.employee_id}
                  onClick={() => {
                    setSelectedEmployeeId(g.employee_id)
                    setSelectedResultId(null)
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                    selectedEmployeeId === g.employee_id && 'bg-blue-50'
                  )}
                >
                  <p className="font-medium text-sm text-gray-900">{g.employee_name}</p>
                  <p className="text-xs text-gray-500">{g.employee_department}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{g.results.length} test{g.results.length !== 1 ? 's' : ''}</span>
                    {pending > 0 && (
                      <span className="text-xs text-amber-600">{pending} pending</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Middle: employee's results */}
      <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
        {!selectedEmployee ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-4 text-center">
            Select an employee to view their results
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <p className="font-semibold text-sm text-gray-900">{selectedEmployee.employee_name}</p>
              <p className="text-xs text-gray-500">{selectedEmployee.employee_department}</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {selectedEmployee.results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedResultId(r.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                    selectedResultId === r.id && 'bg-blue-50'
                  )}
                >
                  <p className="font-medium text-sm text-gray-900 truncate">{r.test_title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.submitted_at)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {passBadge(r.pass_fail)}
                    {r.total_score !== null && (
                      <span className="text-xs text-gray-500">{r.total_score}/{r.max_score}</span>
                    )}
                    {!r.is_finalised && (
                      <span className="text-xs text-amber-600">Pending</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: result detail */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {!selectedResultId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a result to review
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : detail ? (
          <>
            <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">{detail.test_title}</h2>
              <p className="text-xs text-gray-500">
                {detail.employee_name} · {detail.employee_department} · {detail.employee_email}
              </p>
              <div className="flex items-center gap-4 mt-2">
                {passBadge(detail.pass_fail)}
                <span className="text-sm text-gray-600">
                  MCQ: <strong>{detail.mcq_score ?? '—'}</strong> ·
                  Subj: <strong>{detail.subjective_score ?? '—'}</strong> ·
                  Total: <strong>{detail.total_score ?? '—'}/{detail.max_score ?? '—'}</strong>
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {detail.answers.map((ans, i) => (
                <div key={ans.question_id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 flex-1">
                      Q{i + 1}. {ans.question_text}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {ans.question_type.toUpperCase()} · {ans.marks}m
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide mr-1">Answer:</span>
                    {ans.answer ?? <em className="text-gray-400">No answer</em>}
                  </p>

                  {ans.question_type === 'mcq' && ans.correct_answer && (
                    <p className="text-xs text-green-700">
                      <span className="font-medium">Correct: </span>{ans.correct_answer}
                    </p>
                  )}

                  {ans.explanation && (
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Explanation: </span>{ans.explanation}
                    </p>
                  )}

                  {ans.question_type === 'subjective' && !detail.is_finalised && (
                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-xs text-gray-500">Marks:</label>
                      <input
                        type="number"
                        min={0}
                        max={ans.marks}
                        step={0.5}
                        value={scores[ans.question_id] ?? ans.awarded_marks ?? ''}
                        onChange={(e) => handleScoreChange(ans.question_id, e.target.value)}
                        className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-400">/ {ans.marks}</span>
                      <button
                        onClick={() => saveScore(ans.question_id, ans.marks)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {ans.question_type === 'subjective' && detail.is_finalised && (
                    <p className="text-xs text-gray-500">
                      Awarded: <strong>{ans.awarded_marks ?? '—'}</strong> / {ans.marks}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!detail.is_finalised && (
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (confirm('Finalise this result? This will compute the total score, set pass/fail, and email the employee.')) {
                      finaliseMutation.mutate(detail.id)
                    }
                  }}
                  loading={finaliseMutation.isPending}
                >
                  Finalise Result & Send Email
                </Button>
              </div>
            )}
          </>
        ) : null}
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
