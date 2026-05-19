export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { is_active } = body

  const { rows } = await db.query(
    `UPDATE employees SET is_active=$1 WHERE id=$2 RETURNING id, name, is_active`,
    [is_active, params.id]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  return NextResponse.json({ employee: rows[0] })
}
