export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

interface ChapterInput {
  name: string
  topics: { name: string; youtube_url?: string; doc_url?: string; notes?: string }[]
}

interface CourseInput {
  name: string
  description?: string
  departments: string[]
  chapters: ChapterInput[]
}

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `SELECT
      tc.id, tc.name, tc.description, tc.departments, tc.order_index,
      COUNT(DISTINCT tch.id)::int as chapter_count,
      COUNT(DISTINCT tt.id)::int as topic_count
    FROM training_courses tc
    LEFT JOIN training_chapters tch ON tch.course_id = tc.id
    LEFT JOIN training_topics tt ON tt.chapter_id = tch.id
    GROUP BY tc.id
    ORDER BY tc.order_index`
  )

  return NextResponse.json({ courses: rows })
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error
  const adminId = auth.user!.sub

  const body = await request.json().catch(() => null) as CourseInput | null
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Course name required' }, { status: 400 })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const { rows: [course] } = await client.query(
      `INSERT INTO training_courses (name, description, departments, order_index, created_by)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM training_courses), $4)
       RETURNING id`,
      [body.name.trim(), body.description ?? null, body.departments ?? ['Sales', 'Support'], adminId]
    )

    for (let i = 0; i < (body.chapters ?? []).length; i++) {
      const ch = body.chapters[i]
      const { rows: [chapter] } = await client.query(
        `INSERT INTO training_chapters (course_id, name, order_index) VALUES ($1, $2, $3) RETURNING id`,
        [course.id, ch.name, i + 1]
      )
      for (let j = 0; j < (ch.topics ?? []).length; j++) {
        const t = ch.topics[j]
        await client.query(
          `INSERT INTO training_topics (chapter_id, name, youtube_url, doc_url, notes, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [chapter.id, t.name, t.youtube_url ?? null, t.doc_url ?? null, t.notes ?? null, j + 1]
        )
      }
    }

    await client.query('COMMIT')
    return NextResponse.json({ id: course.id }, { status: 201 })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
