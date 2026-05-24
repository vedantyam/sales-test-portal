'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../../../lib/api'
import { useExamStore } from '../../../../store/examStore'
import { ExamSession, ShuffledSection } from '../../../../types'
import ExamSidebar from '../../../../components/employee/ExamSidebar'
import MCQQuestion from '../../../../components/employee/MCQQuestion'
import SubjectiveQuestion from '../../../../components/employee/SubjectiveQuestion'
import SubmitModal from '../../../../components/employee/SubmitModal'
import Button from '../../../../components/ui/Button'

const TAB_VIOLATION_LIMIT = 3

function buildAnswerBuffer(
  sections: ShuffledSection[],
  answers: Record<string, string>,
  explanations: Record<string, string>
): Record<string, unknown> {
  const buf: Record<string, unknown> = {}
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (answers[q.id] === undefined) continue
      if (q.type === 'mcq') {
        buf[q.id] = { answer: answers[q.id], explanation: explanations[q.id] || undefined }
      } else {
        buf[q.id] = answers[q.id]
      }
    }
  }
  for (const [qId, val] of Object.entries(answers)) {
    if (!(qId in buf)) buf[qId] = val
  }
  return buf
}

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.assignmentId as string

  const {
    answers, explanations, visitedQuestions,
    currentSectionIdx, currentQuestionIdx,
    remainingSeconds, isSubmitted,
    setAnswer, clearAnswer, setExplanation, markVisited, navigate,
    setRemaining, markSubmitted, reset,
  } = useExamStore()

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [tabViolations, setTabViolations] = useState(0)
  const [autoSubmitMsg, setAutoSubmitMsg] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const tabViolationsRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answersRef = useRef(answers)
  answersRef.current = answers
  const explanationsRef = useRef(explanations)
  explanationsRef.current = explanations
  const sessionRef = useRef<ExamSession | null>(null)
  const clockOffsetRef = useRef<number>(0)
  const windowEndRef = useRef<number>(0)

  const { data: session, isLoading, error } = useQuery<ExamSession>({
    queryKey: ['exam', assignmentId],
    queryFn: async () => {
      const res = await api.get(`/employee/exam/${assignmentId}`)
      return res.data
    },
    retry: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (session) sessionRef.current = session
  }, [session])

  // Fetch server time once on mount to compute clock offset
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data: { timestamp: number }) => {
        clockOffsetRef.current = data.timestamp - Date.now()
      })
      .catch(() => {})
  }, [])

  const submitMutation = useMutation({
    mutationFn: async (isAuto: boolean) => {
      const sections = sessionRef.current?.sections ?? []
      const buffer = buildAnswerBuffer(sections, answersRef.current, explanationsRef.current)
      await api.patch(`/employee/exam/${assignmentId}/save`, { answers: buffer })
      await api.post(`/employee/exam/${assignmentId}/submit`, { answers: buffer, auto: isAuto })
    },
    onSuccess: (_, isAuto) => {
      markSubmitted()
      if (isAuto) setAutoSubmitMsg('Your exam has been auto-submitted.')
      clearInterval(tickRef.current!)
    },
  })

  useEffect(() => {
    if (!session) return

    if (session.status === 'submitted' || session.status === 'auto_submitted') {
      markSubmitted(session.submitted_at ?? undefined)
      return
    }

    windowEndRef.current = new Date(session.window_end).getTime()
    const remaining = Math.max(0, Math.floor((windowEndRef.current - (Date.now() + clockOffsetRef.current)) / 1000))
    setRemaining(remaining)

    if (session.answers) {
      const serverAnswers: Record<string, string> = {}
      const serverExplanations: Record<string, string> = {}
      for (const [qId, val] of Object.entries(session.answers)) {
        if (typeof val === 'object' && val !== null && 'answer' in (val as Record<string, unknown>)) {
          const v = val as Record<string, string>
          if (v.answer) serverAnswers[qId] = v.answer
          if (v.explanation) serverExplanations[qId] = v.explanation
        } else if (typeof val === 'string') {
          serverAnswers[qId] = val
        }
      }
      const mergedAnswers = { ...serverAnswers, ...answers }
      const mergedExplanations = { ...serverExplanations, ...explanations }
      Object.entries(mergedAnswers).forEach(([qId, ans]) => setAnswer(qId, ans))
      Object.entries(mergedExplanations).forEach(([qId, txt]) => setExplanation(qId, txt))
    }

    if (session.sections.length > 0 && session.sections[0].questions.length > 0) {
      markVisited(session.sections[0].questions[0].id)
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer: tick every second, computing remaining from window_end and server-adjusted clock
  useEffect(() => {
    if (!session || isSubmitted) return
    if (['submitted', 'auto_submitted'].includes(session.status)) return
    tickRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((windowEndRef.current - (Date.now() + clockOffsetRef.current)) / 1000))
      setRemaining(remaining)
    }, 1000)
    return () => clearInterval(tickRef.current!)
  }, [session, isSubmitted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (remainingSeconds === 0 && session && !isSubmitted && !submitMutation.isPending) {
      setAutoSubmitMsg('Time is up! Your exam is being submitted.')
      submitMutation.mutate(true)
    }
  }, [remainingSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session || isSubmitted) return
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabViolationsRef.current += 1
        setTabViolations(tabViolationsRef.current)
        if (tabViolationsRef.current >= TAB_VIOLATION_LIMIT) {
          setAutoSubmitMsg(`Auto-submitted: ${TAB_VIOLATION_LIMIT} tab switches detected.`)
          submitMutation.mutate(true)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, isSubmitted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => {
      setIsOffline(false)
      const sections = sessionRef.current?.sections ?? []
      const buffer = buildAnswerBuffer(sections, answersRef.current, explanationsRef.current)
      api.patch(`/employee/exam/${assignmentId}/save`, { answers: buffer }).catch(() => {})
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [assignmentId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    clearInterval(tickRef.current!)
  }, [])

  const handleAnswer = useCallback((qId: string, value: string) => {
    setAnswer(qId, value)
  }, [setAnswer])

  const handleClear = useCallback((qId: string) => {
    clearAnswer(qId)
  }, [clearAnswer])

  const handleNavigate = useCallback((sIdx: number, qIdx: number) => {
    if (!session) return
    const sec = session.sections[sIdx]
    if (sec?.questions[qIdx]) markVisited(sec.questions[qIdx].id)
    navigate(sIdx, qIdx)
  }, [session, markVisited, navigate])

  function navPrev() {
    const sections = session?.sections ?? []
    if (currentQuestionIdx > 0) {
      handleNavigate(currentSectionIdx, currentQuestionIdx - 1)
    } else if (currentSectionIdx > 0) {
      const prevSec = sections[currentSectionIdx - 1]
      handleNavigate(currentSectionIdx - 1, prevSec.questions.length - 1)
    }
  }

  function navNext() {
    const sections = session?.sections ?? []
    const curSec = sections[currentSectionIdx]
    if (!curSec) return
    if (currentQuestionIdx < curSec.questions.length - 1) {
      handleNavigate(currentSectionIdx, currentQuestionIdx + 1)
    } else if (currentSectionIdx < sections.length - 1) {
      handleNavigate(currentSectionIdx + 1, 0)
    }
  }

  function hasPrev() {
    return currentSectionIdx > 0 || currentQuestionIdx > 0
  }

  function hasNext() {
    if (!session) return false
    const sections = session.sections
    const curSec = sections[currentSectionIdx]
    if (!curSec) return false
    return currentQuestionIdx < curSec.questions.length - 1 || currentSectionIdx < sections.length - 1
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading exam...</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-gray-600">Could not load exam. It may be expired or unavailable.</p>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Exam Submitted</h2>
          {autoSubmitMsg && <p className="text-sm text-amber-600">{autoSubmitMsg}</p>}
          <p className="text-sm text-gray-500">
            Your responses have been recorded. Results will be shared by HR.
          </p>
          <Button
            className="w-full"
            onClick={() => { reset(); router.push('/dashboard') }}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const sections = session.sections
  const currentSection = sections[currentSectionIdx]
  const currentQuestion = currentSection?.questions[currentQuestionIdx]

  if (!currentSection || !currentQuestion) return null

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {isOffline && (
        <div className="bg-red-900 text-red-100 px-4 py-2 text-sm text-center flex-shrink-0">
          You are offline — your answers are saved locally and will sync when connection returns
        </div>
      )}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900 text-sm">{session.title}</h1>
          {tabViolations > 0 && (
            <p className="text-xs text-amber-600">
              Warning: {tabViolations}/{TAB_VIOLATION_LIMIT} tab switches detected
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowSubmitModal(true)}>
          Submit Exam
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ExamSidebar
          sections={sections}
          currentSectionIdx={currentSectionIdx}
          currentQuestionIdx={currentQuestionIdx}
          answers={answers}
          visitedQuestions={visitedQuestions}
          remainingSeconds={remainingSeconds}
          onNavigate={handleNavigate}
          onSubmit={() => setShowSubmitModal(true)}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto h-full">
            {currentQuestion.type === 'mcq' ? (
              <MCQQuestion
                question={currentQuestion}
                sectionTitle={currentSection.title}
                questionNumber={currentQuestionIdx + 1}
                totalInSection={currentSection.questions.length}
                selectedAnswer={answers[currentQuestion.id]}
                explanation={explanations[currentQuestion.id] ?? ''}
                onAnswer={(optId) => handleAnswer(currentQuestion.id, optId)}
                onClear={() => handleClear(currentQuestion.id)}
                onExplanation={(text) => setExplanation(currentQuestion.id, text)}
                onPrev={hasPrev() ? navPrev : undefined}
                onNext={hasNext() ? navNext : undefined}
              />
            ) : (
              <SubjectiveQuestion
                question={currentQuestion}
                sectionTitle={currentSection.title}
                questionNumber={currentQuestionIdx + 1}
                totalInSection={currentSection.questions.length}
                answer={answers[currentQuestion.id] ?? ''}
                onAnswer={(text) => handleAnswer(currentQuestion.id, text)}
                onClear={() => handleClear(currentQuestion.id)}
                onPrev={hasPrev() ? navPrev : undefined}
                onNext={hasNext() ? navNext : undefined}
              />
            )}
          </div>
        </main>
      </div>

      <SubmitModal
        open={showSubmitModal}
        sections={sections}
        answers={answers}
        onCancel={() => setShowSubmitModal(false)}
        onConfirm={() => submitMutation.mutate(false)}
        loading={submitMutation.isPending}
      />
    </div>
  )
}
