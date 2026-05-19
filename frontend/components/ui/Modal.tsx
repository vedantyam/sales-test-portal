'use client'

import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeable?: boolean
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeable = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeable) onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeable, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50"
        onClick={closeable ? onClose : undefined}
      />
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-xl w-full flex flex-col max-h-[90vh]',
          {
            'max-w-sm': size === 'sm',
            'max-w-lg': size === 'md',
            'max-w-2xl': size === 'lg',
            'max-w-4xl': size === 'xl',
          }
        )}
      >
        {(title || closeable) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {closeable && (
              <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
