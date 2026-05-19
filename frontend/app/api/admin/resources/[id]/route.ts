import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rowCount } = await db.query('DELETE FROM resources WHERE id=$1', [params.id])
  if (!rowCount) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json({ deleted: true })
}
