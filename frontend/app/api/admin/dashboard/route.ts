export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const [empRow, testsRow, resultsRow, auditRows] = await Promise.all([
    db.query('SELECT COUNT(*) FROM employees WHERE is_active=true'),
    db.query(`SELECT COUNT(*) FROM tests WHERE status='published'`),
    db.query(`SELECT COUNT(*) FROM results WHERE is_finalised=false`),
    db.query(
      `SELECT id, user_id, action, resource, resource_id, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT 20`
    ),
  ])

  return NextResponse.json({
    total_employees: Number(empRow.rows[0].count),
    active_tests: Number(testsRow.rows[0].count),
    pending_results: Number(resultsRow.rows[0].count),
    recent_audits: auditRows.rows,
  })
}
