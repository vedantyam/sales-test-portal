'use client'

import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { ShuffledSection } from '../../types'
import { PartAnswer } from '../../store/examStore'

interface SubmitModalProps {
  open: boolean
  sections: ShuffledSection[]
  answers: Record<string, string>
  partAnswers: Record<string, PartAnswer[]>
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function SubmitModal({
  open,
  sections,
  answers,
  partAnswers,
  onConfirm,
  onCancel,
  loading,
}: SubmitModalProps) {
  function isAnswered(qId: string, type: string): boolean {
    if (type === 'parts') return partAnswers[qId]?.some(p => p.text.trim()) ?? false
    return !!answers[qId]
  }

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0)
  const answeredCount = sections.reduce((s, sec) =>
    s + sec.questions.filter(q => isAnswered(q.id, q.type)).length, 0)
  const unanswered = totalQuestions - answeredCount

  return (
    <Modal open={open} onClose={loading ? undefined : onCancel} title="Submit Exam" size="sm" closeable={!loading}>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Are you sure you want to submit? This action cannot be undone.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {sections.map((sec) => {
            const answered = sec.questions.filter(q => isAnswered(q.id, q.type)).length
            return (
              <div key={sec.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{sec.title}</span>
                <span className="font-medium">
                  {answered} / {sec.questions.length} answered
                </span>
              </div>
            )
          })}
          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{answeredCount} / {totalQuestions}</span>
          </div>
        </div>

        {unanswered > 0 && (
          <p className="text-sm text-amber-600 font-medium">
            {unanswered} question{unanswered !== 1 ? 's' : ''} left unanswered.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            Go Back
          </Button>
          <Button variant="primary" className="flex-1" onClick={onConfirm} loading={loading}>
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  )
}
