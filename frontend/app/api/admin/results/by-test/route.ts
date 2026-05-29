export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(`
    SELECT
      t.id as test_id,
      t.title,
      COUNT(DISTINCT ta.employee_id)::int as total_submitted,
      COUNT(DISTINCT CASE WHEN r.is_finalised = false OR r.is_finalised IS NULL THEN ta.employee_id END)::int as pending_count,
      MAX(ts.submitted_at) as last_submission
    FROM tests t
    JOIN test_assignments ta ON ta.test_id = t.id
    JOIN test_sessions ts ON ts.assignment_id = ta.id
    LEFT JOIN results r ON r.assignment_id = ta.id
    WHERE ta.status IN ('submitted', 'auto_submitted') AND t.tenant_id IS NULL
    GROUP BY t.id, t.title
    ORDER BY last_submission DESC
  `)

  return NextResponse.json({ tests: rows })
}
