export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { question_id, marks, part_scores } = body as {
    question_id: string
    marks?: number
    part_scores?: Array<{ part_id: string; score: number }>
  }

  const { rows } = await db.query(
    'SELECT is_finalised, subjective_scores, part_scores FROM results WHERE id=$1',
    [params.id]
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (rows[0].is_finalised) return NextResponse.json({ error: 'Result already finalised.' }, { status: 403 })

  if (part_scores !== undefined) {
    const currentPartScores = rows[0].part_scores || {}
    const updatedPartScores = { ...currentPartScores, [question_id]: part_scores }
    await db.query(
      'UPDATE results SET part_scores = $1 WHERE id = $2',
      [JSON.stringify(updatedPartScores), params.id]
    )
    return NextResponse.json({ saved: true, part_scores: updatedPartScores })
  }

  const currentScores = rows[0].subjective_scores || {}
  const updatedScores = { ...currentScores, [question_id]: Number(marks) }

  await db.query(
    'UPDATE results SET subjective_scores = $1 WHERE id = $2',
    [JSON.stringify(updatedScores), params.id]
  )

  return NextResponse.json({ saved: true, scores: updatedScores })
}
