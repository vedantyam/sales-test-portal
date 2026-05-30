export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]
  const type = request.nextUrl.searchParams.get('type') || '6PM'

  const { rows } = await db.query(
    'SELECT * FROM call_reports WHERE report_date = $1 AND report_type = $2',
    [date, type]
  )

  return NextResponse.json({ report: rows[0] || null })
}
