'use client'

import { useEffect } from 'react'
import { cn } from '../../lib/utils'

interface NotificationProps {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onDismiss: () => void
  duration?: number
}

export default function Notification({
  message,
  type = 'info',
  onDismiss,
  duration = 4000,
}: NotificationProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm',
        {
          'bg-green-600 text-white': type === 'success',
          'bg-red-600 text-white': type === 'error',
          'bg-blue-600 text-white': type === 'info',
          'bg-amber-500 text-white': type === 'warning',
        }
      )}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="opacity-75 hover:opacity-100">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
