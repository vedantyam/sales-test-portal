'use client'

import { cn } from '../../lib/utils'
import ExamTimer from './ExamTimer'
import { ShuffledSection } from '../../types'
import { PartAnswer } from '../../store/examStore'

interface ExamSidebarProps {
  sections: ShuffledSection[]
  currentSectionIdx: number
  currentQuestionIdx: number
  answers: Record<string, string>
  partAnswers: Record<string, PartAnswer[]>
  visitedQuestions: string[]
  remainingSeconds: number
  onNavigate: (sIdx: number, qIdx: number) => void
  onSubmit: () => void
}

export default function ExamSidebar({
  sections,
  currentSectionIdx,
  currentQuestionIdx,
  answers,
  partAnswers,
  visitedQuestions,
  remainingSeconds,
  onNavigate,
  onSubmit,
}: ExamSidebarProps) {
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)

  function isQuestionAnswered(qId: string, type: string): boolean {
    if (type === 'parts') return partAnswers[qId]?.some(p => p.text.trim()) ?? false
    return !!answers[qId]
  }

  const answeredCount = sections.reduce((sum, s) =>
    sum + s.questions.filter(q => isQuestionAnswered(q.id, q.type)).length, 0)
  const visitedCount = visitedQuestions.length

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex flex-col items-center gap-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Time Remaining</p>
        <ExamTimer seconds={remainingSeconds} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sections.map((section, sIdx) => (
          <div key={section.id}>
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-wide mb-2',
                sIdx === currentSectionIdx ? 'text-blue-600' : 'text-gray-500'
              )}
            >
              {section.title}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {section.questions.map((q, qIdx) => {
                const isActive = sIdx === currentSectionIdx && qIdx === currentQuestionIdx
                const isAnswered = isQuestionAnswered(q.id, q.type)
                const isVisited = visitedQuestions.includes(q.id)

                return (
                  <button
                    key={q.id}
                    onClick={() => onNavigate(sIdx, qIdx)}
                    className={cn(
                      'w-8 h-8 rounded text-xs font-medium transition-colors',
                      isActive && 'ring-2 ring-blue-500 ring-offset-1',
                      isAnswered
                        ? 'bg-blue-600 text-white'
                        : isVisited
                        ? 'border-2 border-amber-400 bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {qIdx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Answered: <strong className="text-gray-800">{answeredCount}</strong></span>
          <span>Visited: <strong className="text-gray-800">{visitedCount}</strong></span>
          <span>Total: <strong className="text-gray-800">{totalQuestions}</strong></span>
        </div>

        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Answered
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-amber-400 bg-amber-50 inline-block" /> Visited
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Not visited
          </span>
        </div>

        <button
          onClick={onSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          Submit Exam
        </button>
      </div>
    </aside>
  )
}
