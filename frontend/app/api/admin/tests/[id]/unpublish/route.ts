export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `UPDATE tests SET status='draft', updated_at=NOW() WHERE id=$1 RETURNING id, title, status`,
    [params.id]
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ test: rows[0] })
}
