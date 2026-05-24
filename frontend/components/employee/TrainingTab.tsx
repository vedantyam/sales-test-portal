'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

interface TrainingTopic {
  id: string
  name: string
  youtube_url: string | null
  doc_url: string | null
  notes: string | null
  order: number
  is_completed: boolean
}

interface TrainingChapter {
  id: string
  name: string
  order: number
  topics: TrainingTopic[]
}

interface TrainingCourse {
  id: string
  name: string
  order: number
  chapters: TrainingChapter[]
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLIFrameElement, opts: {
        events: { onStateChange: (e: { data: number }) => void }
      }) => void
      PlayerState: { ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export default function TrainingTab() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const ytPlayerRef = useRef<unknown>(null)

  const { data, isLoading } = useQuery<{ courses: TrainingCourse[] }>({
    queryKey: ['training'],
    queryFn: async () => {
      const res = await api.get('/employee/training')
      return res.data
    },
  })

  // Expand first chapter of first course by default
  useEffect(() => {
    if (!data?.courses?.length) return
    const firstChapter = data.courses[0]?.chapters?.[0]
    if (firstChapter) {
      setExpandedChapters((prev) => {
        if (prev.has(firstChapter.id)) return prev
        return new Set([firstChapter.id])
      })
    }
    // Select first topic by default
    if (!selectedTopicId) {
      const firstTopic = firstChapter?.topics?.[0]
      if (firstTopic) setSelectedTopicId(firstTopic.id)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }, [])

  const markTopicComplete = useCallback(async (topicId: string) => {
    await fetch('/api/employee/training/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ topicId }),
    })
    queryClient.invalidateQueries({ queryKey: ['training'] })
  }, [accessToken, queryClient])

  // Set up YouTube player when selectedTopicId changes
  useEffect(() => {
    if (!iframeRef.current || !selectedTopicId) return
    ytPlayerRef.current = null

    const setup = () => {
      if (!iframeRef.current || !window.YT?.Player) return
      const topicId = selectedTopicId
      ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === 0) markTopicComplete(topicId)
          },
        },
      })
    }

    if (window.YT?.Player) {
      setup()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        setup()
        if (prev) prev()
      }
    }
  }, [selectedTopicId, markTopicComplete])

  function toggleChapter(chapterId: string) {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  const allTopics = data?.courses.flatMap((c) => c.chapters.flatMap((ch) => ch.topics)) ?? []
  const selectedTopic = allTopics.find((t) => t.id === selectedTopicId) ?? null

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
  }

  if (!data?.courses?.length) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400 text-sm">No training content available yet.</p>
      </div>
    )
  }

  const videoId = selectedTopic?.youtube_url ? extractYouTubeId(selectedTopic.youtube_url) : null

  return (
    <div className="flex gap-0 h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Left sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
        {data.courses.map((course) => (
          <div key={course.id}>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{course.name}</p>
            </div>
            {course.chapters.map((chapter) => {
              const completedCount = chapter.topics.filter((t) => t.is_completed).length
              const isExpanded = expandedChapters.has(chapter.id)
              return (
                <div key={chapter.id}>
                  <button
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="flex-1 text-left text-sm font-medium text-gray-800 truncate">{chapter.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{completedCount}/{chapter.topics.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="bg-white">
                      {chapter.topics.length === 0 ? (
                        <div className="px-6 py-3 text-xs text-gray-400">Coming Soon</div>
                      ) : (
                        chapter.topics.map((topic) => {
                          const isSelected = topic.id === selectedTopicId
                          return (
                            <button
                              key={topic.id}
                              onClick={() => setSelectedTopicId(topic.id)}
                              className={`w-full flex items-center gap-3 px-6 py-2.5 border-b border-gray-50 transition-colors text-left ${
                                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              {topic.is_completed ? (
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-blue-600 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                              )}
                              <span className={`text-sm truncate ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                {topic.name}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </aside>

      {/* Right content panel */}
      <main className="flex-1 overflow-y-auto p-6">
        {!selectedTopic ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Select a topic to start learning.</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">{selectedTopic.name}</h2>

            {videoId ? (
              <iframe
                ref={iframeRef}
                key={selectedTopicId}
                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                className="w-full aspect-video rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No video available for this topic.</p>
              </div>
            )}

            {selectedTopic.doc_url && (
              <a
                href={selectedTopic.doc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors"
              >
                Open Resource Doc
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            {selectedTopic.notes && (
              <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{selectedTopic.notes}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
