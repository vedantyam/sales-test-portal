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
  const search = searchParams.get('search') || ''

  const params: unknown[] = []
  let where = 'WHERE 1=1'
  if (search) {
    where += ' AND q.client_name ILIKE $1'
    params.push(`%${search}%`)
  }

  const { rows } = await db.query(
    `SELECT
      q.id, q.client_name, q.client_phone, q.place_of_supply,
      q.plan_name, q.total_amount, q.quote_date, q.status,
      e.name as salesperson_name
     FROM quotations q
     LEFT JOIN employees e ON e.id = q.employee_id
     ${where}
     ORDER BY q.quote_date DESC
     LIMIT 200`,
    params
  )

  return NextResponse.json({ customers: rows })
}
