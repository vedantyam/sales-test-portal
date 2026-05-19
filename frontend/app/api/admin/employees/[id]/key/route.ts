export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    'SELECT access_key_plain FROM employees WHERE id=$1',
    [params.id]
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (!rows[0].access_key_plain) return NextResponse.json({ error: 'Key not available for this employee.' }, { status: 404 })

  return NextResponse.json({ access_key: rows[0].access_key_plain })
}
