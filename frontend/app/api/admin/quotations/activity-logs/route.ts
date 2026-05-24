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
    `SELECT ql.*, e.name as employee_name, q.quote_number
     FROM quotation_activity_logs ql
     LEFT JOIN employees e ON e.id = ql.employee_id
     LEFT JOIN quotations q ON q.id = ql.quotation_id
     ORDER BY ql.created_at DESC
     LIMIT 200`
  )

  return NextResponse.json({ logs: rows })
}
