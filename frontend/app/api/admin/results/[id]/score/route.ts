export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { question_id, marks } = body

  const { rows: existing } = await db.query('SELECT is_finalised FROM results WHERE id=$1', [params.id])
  if (!existing[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (existing[0].is_finalised) return NextResponse.json({ error: 'Result already finalised.' }, { status: 403 })

  await db.query(
    `UPDATE results
     SET subjective_answers = jsonb_set(COALESCE(subjective_answers, '{}'), $1, to_jsonb($2::numeric))
     WHERE id=$3`,
    [`{${question_id}}`, marks, params.id]
  )

  return NextResponse.json({ saved: true })
}
