export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows: courses } = await db.query(
    `SELECT id, name, description, departments, order_index FROM training_courses WHERE id=$1`,
    [params.id]
  )
  if (!courses[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { rows: chapters } = await db.query(
    `SELECT id, name, order_index FROM training_chapters WHERE course_id=$1 ORDER BY order_index`,
    [params.id]
  )

  const chapterIds = chapters.map((c: { id: string }) => c.id)
  const { rows: topics } = chapterIds.length > 0
    ? await db.query(
        `SELECT id, chapter_id, name, youtube_url, doc_url, notes, order_index
         FROM training_topics
         WHERE chapter_id = ANY($1::uuid[])
         ORDER BY order_index`,
        [chapterIds]
      )
    : { rows: [] }

  interface TopicRow { id: string; chapter_id: string; name: string; youtube_url: string | null; doc_url: string | null; notes: string | null; order_index: number }
  const topicsByChapter: Record<string, TopicRow[]> = {}
  for (const t of topics as TopicRow[]) {
    if (!topicsByChapter[t.chapter_id]) topicsByChapter[t.chapter_id] = []
    topicsByChapter[t.chapter_id].push(t)
  }

  return NextResponse.json({
    ...courses[0],
    chapters: chapters.map((ch: { id: string; name: string; order_index: number }) => ({
      ...ch,
      topics: topicsByChapter[ch.id] ?? [],
    })),
  })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null) as CourseInput | null
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Course name required' }, { status: 400 })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const { rowCount } = await client.query(
      `UPDATE training_courses SET name=$1, description=$2, departments=$3, updated_at=NOW() WHERE id=$4`,
      [body.name.trim(), body.description ?? null, body.departments ?? ['Sales', 'Support'], params.id]
    )
    if (!rowCount) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Full replace: delete existing chapters (cascade deletes topics)
    await client.query(`DELETE FROM training_chapters WHERE course_id=$1`, [params.id])

    for (let i = 0; i < (body.chapters ?? []).length; i++) {
      const ch = body.chapters[i]
      const { rows: [chapter] } = await client.query(
        `INSERT INTO training_chapters (course_id, name, order_index) VALUES ($1, $2, $3) RETURNING id`,
        [params.id, ch.name, i + 1]
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
    return NextResponse.json({ success: true })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rowCount } = await db.query(`DELETE FROM training_courses WHERE id=$1`, [params.id])
  if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
