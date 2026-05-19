'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../../../lib/api'
import { useExamStore } from '../../../../store/examStore'
import { ExamSession } from '../../../../types'
import ExamSidebar from '../../../../components/employee/ExamSidebar'
import MCQQuestion from '../../../../components/employee/MCQQuestion'
import SubjectiveQuestion from '../../../../components/employee/SubjectiveQuestion'
import SubmitModal from '../../../../components/employee/SubmitModal'
import Button from '../../../../components/ui/Button'

const TAB_VIOLATION_LIMIT = 3
const AUTOSAVE_INTERVAL_MS = 60_000

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.assignmentId as string

  const {
    answers, visitedQuestions,
    currentSectionIdx, currentQuestionIdx,
    remainingSeconds, isSubmitted,
    setAnswer, clearAnswer, markVisited, navigate,
    setRemaining, tick, markSubmitted, reset,
  } = useExamStore()

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [tabViolations, setTabViolations] = useState(0)
  const [autoSubmitMsg, setAutoSubmitMsg] = useState('')
  const tabViolationsRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answersRef = useRef(answers)
  answersRef.current = answers

  // GET session — starts if not started, resumes if in_progress
  const { data: session, isLoading, error } = useQuery<ExamSession>({
    queryKey: ['exam', assignmentId],
    queryFn: async () => {
      const res = await api.get(`/employee/exam/${assignmentId}`)
      return res.data
    },
    retry: false,
    staleTime: Infinity,
  })

  const submitMutation = useMutation({
    mutationFn: async (isAuto: boolean) => {
      // Save latest answers first, then submit
      await api.patch(`/employee/exam/${assignmentId}/save`, { answers: answersRef.current })
      await api.post(`/employee/exam/${assignmentId}/submit`, { answers: answersRef.current, auto: isAuto })
    },
    onSuccess: (_, isAuto) => {
      markSubmitted()
      if (isAuto) setAutoSubmitMsg('Your exam has been auto-submitted.')
      clearInterval(tickRef.current!)
      clearInterval(autoSaveRef.current!)
    },
  })

  const autoSaveMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/employee/exam/${assignmentId}/save`, { answers: answersRef.current })
    },
  })

  // Init store from session
  useEffect(() => {
    if (!session) return

    if (session.status === 'submitted' || session.status === 'auto_submitted') {
      markSubmitted(session.submitted_at ?? undefined)
      return
    }

    setRemaining(session.remaining_seconds)

    // Restore server answers into store (only if store is empty)
    if (Object.keys(answers).length === 0 && session.answers) {
      Object.entries(session.answers).forEach(([qId, ans]) => setAnswer(qId, ans))
    }

    // Mark first question visited
    if (session.sections.length > 0 && session.sections[0].questions.length > 0) {
      markVisited(session.sections[0].questions[0].id)
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (!session || isSubmitted) return
    if (['submitted', 'auto_submitted'].includes(session.status)) return

    tickRef.current = setInterval(tick, 1000)
    return () => clearInterval(tickRef.current!)
  }, [session, isSubmitted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit when time runs out
  useEffect(() => {
    if (remainingSeconds === 0 && session && !isSubmitted && !submitMutation.isPending) {
      setAutoSubmitMsg('Time is up! Your exam is being submitted.')
      submitMutation.mutate(true)
    }
  }, [remainingSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save every 60s
  useEffect(() => {
    if (!session || isSubmitted) return
    autoSaveRef.current = setInterval(() => { autoSaveMutation.mutate() }, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(autoSaveRef.current!)
  }, [session, isSubmitted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tab switch detection
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

  useEffect(() => () => {
    clearInterval(tickRef.current!)
    clearInterval(autoSaveRef.current!)
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

  // Loading
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
                onAnswer={(optId) => handleAnswer(currentQuestion.id, optId)}
                onClear={() => handleClear(currentQuestion.id)}
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
