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
    `SELECT r.id, r.assignment_id, r.employee_id, r.test_id,
            r.mcq_score, r.subjective_score, r.total_score, r.max_score,
            r.pass_fail, r.is_finalised, r.is_released, r.created_at,
            e.name as employee_name, e.email as employee_email, e.department as employee_department,
            t.title as test_title,
            ts.submitted_at
     FROM results r
     JOIN employees e ON e.id = r.employee_id
     JOIN tests t ON t.id = r.test_id
     LEFT JOIN test_sessions ts ON ts.assignment_id = r.assignment_id
     WHERE r.tenant_id IS NULL
     ORDER BY r.created_at DESC`
  )
  return NextResponse.json({ results: rows })
}
