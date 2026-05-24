export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `SELECT
      COUNT(*)::int as total_quotations,
      COALESCE(SUM(total_amount), 0)::numeric as total_revenue,
      COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
      COUNT(*) FILTER (WHERE status = 'draft')::int as draft
     FROM quotations`
  )

  return NextResponse.json(rows[0])
}
