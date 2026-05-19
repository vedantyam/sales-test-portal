export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  const employeeId = auth.user!.sub

  await db.query(
    `UPDATE test_assignments SET status='expired'
     WHERE employee_id=$1 AND status IN ('pending','in_progress') AND window_end < NOW()`,
    [employeeId]
  )

  const { rows } = await db.query(
    `SELECT ta.id, ta.status, ta.window_start, ta.window_end, ta.assigned_at,
            t.id as test_id, t.title, t.description, t.duration_minutes, t.pass_score_pct, t.guidelines_text,
            jsonb_array_length(t.sections) as section_count,
            (SELECT COALESCE(SUM(jsonb_array_length(s->'questions')), 0)
             FROM jsonb_array_elements(t.sections) s) as total_questions,
            r.pass_fail, r.total_score, r.max_score, r.mcq_score, r.subjective_score,
            r.is_finalised, r.is_released,
            ts.tab_switch_count
     FROM test_assignments ta
     JOIN tests t ON t.id = ta.test_id
     LEFT JOIN results r ON r.assignment_id = ta.id
     LEFT JOIN test_sessions ts ON ts.assignment_id = ta.id
     WHERE ta.employee_id = $1 AND ta.status != 'cancelled'
     ORDER BY ta.window_start DESC`,
    [employeeId]
  )

  return NextResponse.json({ assignments: rows })
}
