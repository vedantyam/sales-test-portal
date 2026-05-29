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
      creator_name,
      creator_email,
      COUNT(*)::int as total_quotations,
      COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
      COUNT(*) FILTER (WHERE status = 'accepted')::int as accepted,
      COUNT(*) FILTER (WHERE include_agreement = true)::int as total_agreements,
      COALESCE(SUM(total_amount), 0)::numeric as total_value
     FROM quotations
     GROUP BY creator_name, creator_email
     ORDER BY total_quotations DESC`
  )

  return NextResponse.json({ data: rows })
}
