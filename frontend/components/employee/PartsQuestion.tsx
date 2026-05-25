'use client'

import { countWords } from '../../lib/utils'
import { ShuffledQuestion, QuestionPart } from '../../types'
import { PartAnswer } from '../../store/examStore'
import Textarea from '../ui/Textarea'

const PART_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

interface PartsQuestionProps {
  question: ShuffledQuestion
  sectionTitle: string
  questionNumber: number
  totalInSection: number
  partAnswers: PartAnswer[]
  onPartAnswer: (partId: string, text: string) => void
  onClear: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function PartsQuestion({
  question,
  sectionTitle,
  questionNumber,
  totalInSection,
  partAnswers,
  onPartAnswer,
  onClear,
  onPrev,
  onNext,
}: PartsQuestionProps) {
  const parts: QuestionPart[] = question.parts ?? []
  const hasAnyAnswer = partAnswers.some(p => p.text.trim())

  function getPartText(partId: string) {
    return partAnswers.find(p => p.part_id === partId)?.text ?? ''
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {sectionTitle} · Question {questionNumber} of {totalInSection}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
            Part-based · {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 mb-5">
        <p className="text-base font-medium text-gray-900 leading-relaxed">{question.text}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5">
        {parts.map((part, idx) => {
          const label = PART_LABELS[idx] ?? String(idx + 1)
          const text = getPartText(part.id)
          const wordCount = countWords(text)

          return (
            <div key={part.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-gray-800 text-white px-2 py-0.5 rounded">
                  Part {label}
                </span>
                <span className="text-xs text-gray-500">{part.marks} mark{part.marks !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-sm text-gray-800 mb-3 leading-relaxed">{part.text}</p>
              <Textarea
                value={text}
                onChange={(e) => onPartAnswer(part.id, e.target.value)}
                rows={5}
                placeholder="Type your answer here..."
                className="resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex-shrink-0 mt-4 flex items-center justify-between">
        <button
          onClick={onClear}
          disabled={!hasAnyAnswer}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clear All Parts
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
