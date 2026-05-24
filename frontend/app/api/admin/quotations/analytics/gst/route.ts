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
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const params: unknown[] = []
  let where = 'WHERE 1=1'
  if (from) { where += ` AND q.quote_date >= $${params.length + 1}`; params.push(from) }
  if (to) { where += ` AND q.quote_date <= $${params.length + 1}`; params.push(to) }

  const { rows } = await db.query(
    `SELECT
      q.quote_date, q.client_name, q.plan_name,
      q.sub_total, q.igst_amount, q.total_amount, q.quote_number
     FROM quotations q
     ${where}
     ORDER BY q.quote_date DESC`,
    params
  )

  return NextResponse.json({ data: rows })
}
