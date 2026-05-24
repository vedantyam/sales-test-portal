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
    `SELECT q.*, e.name as employee_name, e.department
     FROM quotations q
     LEFT JOIN employees e ON e.id = q.employee_id
     ORDER BY q.created_at DESC`
  )

  return NextResponse.json({ quotations: rows })
}
