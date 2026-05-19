export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'
import { randomUUID } from 'crypto'

function normalizeSections(sections: any[]): any[] {
  return (sections || []).map((s: any, si: number) => ({
    ...s,
    id: s.id || randomUUID(),
    order: si + 1,
    questions: (s.questions || []).map((q: any, qi: number) => ({
      ...q,
      id: q.id || randomUUID(),
      order: qi + 1,
    })),
  }))
}

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `SELECT id, title, description, duration_minutes, pass_score_pct, status, created_at,
            (SELECT COUNT(*) FROM test_assignments WHERE test_id = tests.id) as assignment_count,
            jsonb_array_length(sections) as section_count,
            (SELECT COALESCE(SUM(jsonb_array_length(s->'questions')), 0)
             FROM jsonb_array_elements(sections) s) as total_questions
     FROM tests ORDER BY created_at DESC`
  )
  return NextResponse.json({ tests: rows })
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { title, description, guidelines_text, duration_minutes, pass_score_pct, sections } = body
  const adminId = auth.user!.sub

  if (!title || !duration_minutes) {
    return NextResponse.json({ error: 'Title and duration are required.' }, { status: 400 })
  }

  const normalized = normalizeSections(sections)

  const { rows } = await db.query(
    `INSERT INTO tests (title, description, guidelines_text, duration_minutes, pass_score_pct, sections, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, description || null, guidelines_text || null, duration_minutes, pass_score_pct || 60, JSON.stringify(normalized), adminId]
  )

  return NextResponse.json({ test: rows[0] }, { status: 201 })
}
