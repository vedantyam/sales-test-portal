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
      e.id as employee_id,
      e.name as employee_name,
      e.department,
      COUNT(q.id)::int as total_quotes,
      COALESCE(SUM(q.total_amount), 0)::numeric as total_revenue
     FROM employees e
     JOIN quotations q ON q.employee_id = e.id
     GROUP BY e.id, e.name, e.department
     ORDER BY total_revenue DESC`
  )

  return NextResponse.json({ data: rows })
}
