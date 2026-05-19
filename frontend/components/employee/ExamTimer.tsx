'use client'

import { formatTimer } from '../../lib/utils'
import { cn } from '../../lib/utils'

interface ExamTimerProps {
  seconds: number
}

export default function ExamTimer({ seconds }: ExamTimerProps) {
  const isWarning = seconds <= 600 && seconds > 120
  const isDanger = seconds <= 120

  return (
    <div
      className={cn(
        'text-2xl font-mono font-bold tabular-nums',
        isDanger && 'text-red-600 animate-pulse',
        isWarning && 'text-amber-600',
        !isWarning && !isDanger && 'text-gray-700'
      )}
    >
      {formatTimer(seconds)}
    </div>
  )
}
