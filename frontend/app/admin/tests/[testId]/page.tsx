'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../../../lib/api'
import { Test } from '../../../../types'
import TestBuilder from '../../../../components/admin/TestBuilder'
import Notification from '../../../../components/ui/Notification'
import { useState } from 'react'

function buildInitialData(test: Test) {
  return {
    title: test.title,
    description: test.description ?? '',
    duration_minutes: test.duration_minutes,
    sections: test.sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      questions: sec.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options ?? [],
        correct_answer: q.correct_answer ?? '',
        explanation: q.explanation ?? '',
        marks: q.marks,
        word_limit: q.word_limit ?? ('' as '' | number),
      })),
    })),
  }
}

export default function TestBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const testId = params.testId as string
  const isNew = testId === 'new'
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const { data: test, isLoading } = useQuery<Test>({
    queryKey: ['test', testId],
    queryFn: async () => {
      const res = await adminApi.get(`/admin/tests/${testId}`)
      return res.data.test
    },
    enabled: !isNew,
  })

  const createMutation = useMutation({
    mutationFn: async (data: object) => {
      const res = await adminApi.post('/admin/tests', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      setNotification({ msg: 'Test created', type: 'success' })
      setTimeout(() => router.push('/admin/tests'), 800)
    },
    onError: () => setNotification({ msg: 'Failed to create test', type: 'error' }),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: object) => {
      await adminApi.put(`/admin/tests/${testId}`, data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tests'] })
      qc.invalidateQueries({ queryKey: ['test', testId] })
      setNotification({ msg: 'Test updated. Existing assignments will use the updated content.', type: 'success' })
      setTimeout(() => router.push('/admin/tests'), 800)
    },
    onError: () => setNotification({ msg: 'Failed to save test', type: 'error' }),
  })

  if (!isNew && isLoading) {
    return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
  }

  if (!isNew && !test) {
    return <div className="text-center py-16 text-gray-400 text-sm">Test not found.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/tests')} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isNew ? 'Create Test' : `Edit: ${test?.title}`}
        </h1>
      </div>

      <TestBuilder
        initialData={test ? buildInitialData(test) : undefined}
        onSave={isNew ? createMutation.mutateAsync : updateMutation.mutateAsync}
        onCancel={() => router.push('/admin/tests')}
      />

      {notification && (
        <Notification
          message={notification.msg}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}
    </div>
  )
}
