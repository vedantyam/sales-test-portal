'use client'

import { countWords } from '../../lib/utils'
import { ShuffledQuestion } from '../../types'
import Textarea from '../ui/Textarea'

interface SubjectiveQuestionProps {
  question: ShuffledQuestion
  sectionTitle: string
  questionNumber: number
  totalInSection: number
  answer: string
  onAnswer: (text: string) => void
  onClear: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function SubjectiveQuestion({
  question,
  sectionTitle,
  questionNumber,
  totalInSection,
  answer,
  onAnswer,
  onClear,
  onPrev,
  onNext,
}: SubjectiveQuestionProps) {
  const wordCount = countWords(answer)
  const overLimit = question.word_limit ? wordCount > question.word_limit : false

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {sectionTitle} · Question {questionNumber} of {totalInSection}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
            Subjective · {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
          {question.word_limit && (
            <span className="text-xs text-gray-500">
              Word limit: {question.word_limit}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 mb-6">
        <p className="text-base font-medium text-gray-900 leading-relaxed">{question.text}</p>
      </div>

      <div className="flex-1 flex flex-col">
        <Textarea
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          rows={10}
          placeholder="Type your answer here..."
          className="flex-1 resize-none"
        />
        <div className="flex justify-between mt-1.5">
          <span className={`text-xs ${overLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {wordCount} word{wordCount !== 1 ? 's' : ''}
            {question.word_limit && ` / ${question.word_limit}`}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 mt-4 flex items-center justify-between">
        <button
          onClick={onClear}
          disabled={!answer}
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
