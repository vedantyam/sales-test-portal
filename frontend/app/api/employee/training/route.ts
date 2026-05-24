export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

interface TopicRow {
  course_id: string
  course_name: string
  course_order: number
  chapter_id: string
  chapter_name: string
  chapter_order: number
  topic_id: string | null
  topic_name: string | null
  youtube_url: string | null
  doc_url: string | null
  notes: string | null
  topic_order: number | null
  is_completed: boolean
}

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const employeeId = auth.user!.sub

  // Use JWT department if present; fall back to DB lookup (refresh tokens omit department)
  let department = auth.user!.department ?? ''
  if (!department) {
    const { rows: emp } = await db.query<{ department: string }>(
      `SELECT department FROM employees WHERE id = $1`,
      [employeeId]
    )
    department = emp[0]?.department ?? ''
  }

  const { rows } = await db.query<TopicRow>(
    `SELECT
      tc.id as course_id, tc.name as course_name, tc.order_index as course_order,
      tch.id as chapter_id, tch.name as chapter_name, tch.order_index as chapter_order,
      tt.id as topic_id, tt.name as topic_name, tt.youtube_url, tt.doc_url,
      tt.notes, tt.order_index as topic_order,
      CASE WHEN tp.id IS NOT NULL THEN true ELSE false END as is_completed
    FROM training_courses tc
    JOIN training_chapters tch ON tch.course_id = tc.id
    LEFT JOIN training_topics tt ON tt.chapter_id = tch.id
    LEFT JOIN training_progress tp ON tp.topic_id = tt.id AND tp.employee_id = $1
    WHERE tc.departments @> ARRAY[$2]::text[]
    ORDER BY tc.order_index, tch.order_index, tt.order_index`,
    [employeeId, department]
  )

  // Group into nested structure
  const courseMap = new Map<string, {
    id: string; name: string; order: number;
    chapters: Map<string, { id: string; name: string; order: number; topics: TopicRow[] }>
  }>()

  for (const row of rows) {
    if (!courseMap.has(row.course_id)) {
      courseMap.set(row.course_id, { id: row.course_id, name: row.course_name, order: row.course_order, chapters: new Map() })
    }
    const course = courseMap.get(row.course_id)!
    if (!course.chapters.has(row.chapter_id)) {
      course.chapters.set(row.chapter_id, { id: row.chapter_id, name: row.chapter_name, order: row.chapter_order, topics: [] })
    }
    if (row.topic_id) {
      course.chapters.get(row.chapter_id)!.topics.push(row)
    }
  }

  const courses = Array.from(courseMap.values()).map((c) => ({
    id: c.id,
    name: c.name,
    order: c.order,
    chapters: Array.from(c.chapters.values()).map((ch) => ({
      id: ch.id,
      name: ch.name,
      order: ch.order,
      topics: ch.topics.map((t) => ({
        id: t.topic_id!,
        name: t.topic_name!,
        youtube_url: t.youtube_url,
        doc_url: t.doc_url,
        notes: t.notes,
        order: t.topic_order ?? 0,
        is_completed: t.is_completed,
      })),
    })),
  }))

  return NextResponse.json({ courses })
}
