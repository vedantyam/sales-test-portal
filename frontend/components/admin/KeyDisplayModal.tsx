'use client'

import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

interface KeyDisplayModalProps {
  open: boolean
  employeeName: string
  accessKey: string
  onClose: () => void
}

export default function KeyDisplayModal({ open, employeeName, accessKey, onClose }: KeyDisplayModalProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(accessKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Modal open={open} title="Access Key Generated" size="sm" closeable={false}>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Access key for <strong>{employeeName}</strong>. This is the only time it will be shown — copy it now.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-600 font-medium mb-2 uppercase tracking-wide">Access Key</p>
          <p className="font-mono text-2xl font-bold text-gray-900 tracking-widest">{accessKey}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Key'}
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Share this key securely with the employee. It cannot be retrieved later.
        </p>
      </div>
    </Modal>
  )
}
