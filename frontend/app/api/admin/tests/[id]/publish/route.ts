import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows: existing } = await db.query('SELECT sections FROM tests WHERE id=$1', [params.id])
  if (!existing[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const sections = existing[0].sections as any[]
  if (!sections || sections.length === 0) {
    return NextResponse.json({ error: 'Cannot publish a test with no sections.' }, { status: 400 })
  }

  const { rows } = await db.query(
    `UPDATE tests SET status='published', updated_at=NOW() WHERE id=$1 RETURNING id, title, status`,
    [params.id]
  )
  return NextResponse.json({ test: rows[0] })
}
