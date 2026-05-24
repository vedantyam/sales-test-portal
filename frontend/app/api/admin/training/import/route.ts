export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

interface TopicInput { name: string; youtube_url?: string; doc_url?: string; notes?: string }
interface ChapterInput { name: string; topics: TopicInput[] }
interface ParsedCourse { name: string; description?: string; departments: string[]; chapters: ChapterInput[] }

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error
  const adminId = auth.user!.sub

  const body = await request.json().catch(() => null) as { courses?: ParsedCourse[] } | null
  if (!body?.courses?.length) {
    return NextResponse.json({ error: 'No courses provided' }, { status: 400 })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    for (const course of body.courses) {
      const { rows: [c] } = await client.query(
        `INSERT INTO training_courses (name, description, departments, order_index, created_by)
         VALUES ($1, $2, $3, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM training_courses), $4)
         RETURNING id`,
        [course.name, course.description ?? null, course.departments ?? ['Sales', 'Support'], adminId]
      )
      for (let i = 0; i < (course.chapters ?? []).length; i++) {
        const ch = course.chapters[i]
        const { rows: [chapter] } = await client.query(
          `INSERT INTO training_chapters (course_id, name, order_index) VALUES ($1, $2, $3) RETURNING id`,
          [c.id, ch.name, i + 1]
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
    }

    await client.query('COMMIT')
    return NextResponse.json({ imported: body.courses.length }, { status: 201 })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
