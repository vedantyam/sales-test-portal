export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `SELECT q.*, e.name as employee_name
     FROM quotations q
     LEFT JOIN employees e ON e.id = q.employee_id
     WHERE q.employee_id = $1
     ORDER BY q.created_at DESC`,
    [params.employeeId]
  )

  return NextResponse.json({ quotations: rows })
}
