export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query('SELECT status FROM test_assignments WHERE id=$1', [params.id])
  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (rows[0].status !== 'pending') {
    return NextResponse.json({ error: 'Can only cancel pending assignments.' }, { status: 403 })
  }
  await db.query(`UPDATE test_assignments SET status='cancelled' WHERE id=$1`, [params.id])
  return NextResponse.json({ cancelled: true })
}
