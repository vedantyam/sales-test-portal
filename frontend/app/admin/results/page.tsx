'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../../lib/api'
import { ResultSummary, ResultDetail } from '../../../types'
import { formatDate } from '../../../lib/utils'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import Notification from '../../../components/ui/Notification'
import { cn } from '../../../lib/utils'

function passBadge(val: 'pass' | 'fail' | null) {
  if (!val) return <Badge variant="gray">Pending</Badge>
  return <Badge variant={val === 'pass' ? 'green' : 'red'}>{val === 'pass' ? 'Pass' : 'Fail'}</Badge>
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [hrDecision, setHrDecision] = useState<'hire' | 'reject' | 'hold' | ''>('')
  const [hrNotes, setHrNotes] = useState('')
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

  // Group results by test for the release panel
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

  const { data: detail, isLoading: loadingDetail } = useQuery<ResultDetail>({
    queryKey: ['result-detail', selectedId],
    queryFn: async () => {
      const res = await adminApi.get(`/admin/results/${selectedId}`)
      return res.data.result
    },
    enabled: !!selectedId,
  })

  const scoreMutation = useMutation({
    mutationFn: async ({ resultId, questionId, marks }: { resultId: string; questionId: string; marks: number }) => {
      await adminApi.patch(`/admin/results/${resultId}/score`, { question_id: questionId, marks })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['result-detail', selectedId] })
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
      qc.invalidateQueries({ queryKey: ['result-detail', selectedId] })
      setNotification({ msg: 'Result finalised and email sent', type: 'success' })
    },
    onError: () => setNotification({ msg: 'Failed to finalise', type: 'error' }),
  })

  const hrMutation = useMutation({
    mutationFn: async ({ resultId, decision, notes }: { resultId: string; decision: string; notes: string }) => {
      await adminApi.post(`/admin/results/${resultId}/hr-decision`, { decision, notes })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['result-detail', selectedId] })
      setNotification({ msg: 'HR decision recorded', type: 'success' })
      setHrDecision('')
      setHrNotes('')
    },
    onError: () => setNotification({ msg: 'Failed to record decision', type: 'error' }),
  })

  const filtered = (results ?? []).filter(
    (r) =>
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.test_title.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_department.toLowerCase().includes(search.toLowerCase())
  )

  function handleScoreChange(questionId: string, val: string) {
    const n = parseFloat(val)
    if (!isNaN(n)) setScores((prev) => ({ ...prev, [questionId]: n }))
  }

  function saveScore(questionId: string, maxMarks: number) {
    if (!selectedId || scores[questionId] === undefined) return
    const marks = Math.min(Math.max(0, scores[questionId]), maxMarks)
    scoreMutation.mutate({ resultId: selectedId, questionId, marks })
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left: results table */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h1 className="text-base font-bold text-gray-900 flex-shrink-0">Results</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRelease((v) => !v)}
              className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1"
            >
              {showRelease ? 'Hide release panel' : 'Release results'}
            </button>
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>

        {showRelease && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Release results by test</p>
            {testGroups.length === 0 && (
              <p className="text-xs text-gray-400">No results yet.</p>
            )}
            {testGroups.map((g) => (
              <div key={g.testId} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.testTitle}</p>
                  <p className="text-xs text-gray-500">
                    {g.finalisedCount}/{g.results.length} finalised
                    {g.releasedCount > 0 && ` · ${g.releasedCount} released`}
                  </p>
                </div>
                {g.allReleased ? (
                  <span className="text-xs text-green-600 font-medium">All released</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={!g.allFinalised || releaseMutation.isPending}
                    onClick={() => releaseMutation.mutate(g.testId)}
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
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No results</div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors',
                  selectedId === r.id && 'bg-blue-50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{r.employee_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {r.test_title} · {r.employee_department}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.submitted_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {passBadge(r.pass_fail)}
                    {r.is_finalised ? (
                      <span className="text-xs text-green-600 font-medium">Finalised</span>
                    ) : (
                      <span className="text-xs text-amber-600">Pending review</span>
                    )}
                    {r.total_score !== null && (
                      <span className="text-xs text-gray-500">{r.total_score}/{r.max_score}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: detail panel */}
      <div className="w-[480px] flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a result to review
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : detail ? (
          <>
            <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">{detail.employee_name}</h2>
              <p className="text-xs text-gray-500">
                {detail.test_title} · {detail.employee_department} · {detail.employee_email}
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
              {/* Answers */}
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

              {/* HR decisions history */}
              {detail.hr_decisions.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">HR Decisions</p>
                  <div className="space-y-2">
                    {detail.hr_decisions.map((d) => (
                      <div key={d.id} className="text-sm">
                        <span className={cn(
                          'font-medium capitalize',
                          d.decision === 'hire' && 'text-green-700',
                          d.decision === 'reject' && 'text-red-700',
                          d.decision === 'hold' && 'text-amber-700',
                        )}>
                          {d.decision}
                        </span>
                        {d.notes && <span className="text-gray-500 ml-2">— {d.notes}</span>}
                        <span className="text-gray-400 text-xs ml-2">{formatDate(d.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HR decision form */}
              {detail.is_finalised && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Record HR Decision</p>
                  <div className="flex gap-2">
                    {(['hire', 'reject', 'hold'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setHrDecision(d)}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize',
                          hrDecision === d
                            ? d === 'hire'
                              ? 'bg-green-600 text-white border-green-600'
                              : d === 'reject'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-amber-500 text-white border-amber-500'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Notes (optional)"
                    value={hrNotes}
                    onChange={(e) => setHrNotes(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    disabled={!hrDecision}
                    onClick={() =>
                      hrMutation.mutate({ resultId: detail.id, decision: hrDecision, notes: hrNotes })
                    }
                    loading={hrMutation.isPending}
                  >
                    Submit Decision
                  </Button>
                </div>
              )}
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
