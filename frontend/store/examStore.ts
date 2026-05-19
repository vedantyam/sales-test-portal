'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ExamState {
  answers: Record<string, string>
  visitedQuestions: string[]
  currentSectionIdx: number
  currentQuestionIdx: number
  remainingSeconds: number
  isSubmitted: boolean
  submittedAt: string | null

  setAnswer: (qId: string, answer: string) => void
  clearAnswer: (qId: string) => void
  markVisited: (qId: string) => void
  navigate: (sectionIdx: number, questionIdx: number) => void
  setRemaining: (s: number) => void
  tick: () => void
  markSubmitted: (at?: string) => void
  reset: () => void
}

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      answers: {},
      visitedQuestions: [],
      currentSectionIdx: 0,
      currentQuestionIdx: 0,
      remainingSeconds: 0,
      isSubmitted: false,
      submittedAt: null,

      setAnswer: (qId, answer) =>
        set((s) => ({ answers: { ...s.answers, [qId]: answer } })),
      clearAnswer: (qId) =>
        set((s) => {
          const a = { ...s.answers }
          delete a[qId]
          return { answers: a }
        }),
      markVisited: (qId) =>
        set((s) => ({
          visitedQuestions: s.visitedQuestions.includes(qId)
            ? s.visitedQuestions
            : [...s.visitedQuestions, qId],
        })),
      navigate: (sectionIdx, questionIdx) =>
        set({ currentSectionIdx: sectionIdx, currentQuestionIdx: questionIdx }),
      setRemaining: (s) => set({ remainingSeconds: s }),
      tick: () => set((s) => ({ remainingSeconds: Math.max(0, s.remainingSeconds - 1) })),
      markSubmitted: (at) => set({ isSubmitted: true, submittedAt: at || new Date().toISOString() }),
      reset: () =>
        set({
          answers: {},
          visitedQuestions: [],
          currentSectionIdx: 0,
          currentQuestionIdx: 0,
          remainingSeconds: 0,
          isSubmitted: false,
          submittedAt: null,
        }),
    }),
    {
      name: 'exam-answers',
      partialize: (state) => ({
        answers: state.answers,
        visitedQuestions: state.visitedQuestions,
        currentSectionIdx: state.currentSectionIdx,
        currentQuestionIdx: state.currentQuestionIdx,
      }),
    }
  )
)
