export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query('SELECT * FROM tests WHERE id=$1', [params.id])
  if (!rows[0]) return NextResponse.json({ error: 'Test not found.' }, { status: 404 })
  return NextResponse.json({ test: rows[0] })
}

async function handleUpdate(request: NextRequest, id: string) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { title, description, guidelines_text, duration_minutes, pass_score_pct, sections } = body

  const { rows: existing } = await db.query('SELECT status FROM tests WHERE id=$1', [id])
  if (!existing[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const normalized = normalizeSections(sections)

  const { rows } = await db.query(
    `UPDATE tests SET title=$1, description=$2, guidelines_text=$3, duration_minutes=$4,
     pass_score_pct=$5, sections=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
    [title, description || null, guidelines_text || null, duration_minutes, pass_score_pct || 60, JSON.stringify(normalized), id]
  )

  return NextResponse.json({ test: rows[0] })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(request, params.id)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(request, params.id)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows: existing } = await db.query('SELECT status FROM tests WHERE id=$1', [params.id])
  if (!existing[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (existing[0].status !== 'draft') {
    return NextResponse.json({ error: 'Only draft tests can be deleted.' }, { status: 403 })
  }
  await db.query('DELETE FROM tests WHERE id=$1', [params.id])
  return NextResponse.json({ deleted: true })
}
