'use client'

import { cn } from '../../lib/utils'
import { ShuffledQuestion } from '../../types'

interface MCQQuestionProps {
  question: ShuffledQuestion
  sectionTitle: string
  questionNumber: number
  totalInSection: number
  selectedAnswer: string | undefined
  explanation: string
  onAnswer: (optionId: string) => void
  onClear: () => void
  onExplanation: (text: string) => void
  onPrev?: () => void
  onNext?: () => void
}

export default function MCQQuestion({
  question,
  sectionTitle,
  questionNumber,
  totalInSection,
  selectedAnswer,
  explanation,
  onAnswer,
  onClear,
  onExplanation,
  onPrev,
  onNext,
}: MCQQuestionProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {sectionTitle} · Question {questionNumber} of {totalInSection}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
            MCQ · {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 mb-6">
        <p className="text-base font-medium text-gray-900 leading-relaxed">{question.text}</p>
      </div>

      <div className="flex-1 space-y-3">
        {question.options?.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onAnswer(opt.id)}
            className={cn(
              'w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm',
              selectedAnswer === opt.id
                ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
            )}
          >
            {opt.text}
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 mt-4">
        <label className="block text-xs text-gray-500 mb-1">
          Optional: Explain why you chose this answer
        </label>
        <textarea
          value={explanation}
          onChange={(e) => onExplanation(e.target.value)}
          placeholder="Write your reasoning here..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white resize-vertical focus:outline-none focus:ring-1 focus:ring-blue-500 font-inherit"
        />
      </div>

      <div className="flex-shrink-0 mt-4 flex items-center justify-between">
        <button
          onClick={onClear}
          disabled={!selectedAnswer}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clear Response
        </button>
        <div className="flex gap-3">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
