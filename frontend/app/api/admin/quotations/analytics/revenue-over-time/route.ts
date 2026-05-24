export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'monthly'

  let trunc: string
  if (period === 'daily') trunc = 'day'
  else if (period === 'weekly') trunc = 'week'
  else trunc = 'month'

  const { rows } = await db.query(
    `SELECT
      date_trunc($1, quote_date) as period,
      COALESCE(SUM(total_amount), 0)::numeric as revenue,
      COUNT(*)::int as count
     FROM quotations
     GROUP BY 1
     ORDER BY 1 DESC
     LIMIT 24`,
    [trunc]
  )

  return NextResponse.json({ data: rows })
}
