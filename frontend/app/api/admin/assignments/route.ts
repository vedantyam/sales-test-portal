import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { test_id, employee_ids, window_start, window_end } = body
  const adminId = auth.user!.sub

  if (!test_id || !employee_ids?.length || !window_start || !window_end) {
    return NextResponse.json(
      { error: 'test_id, employee_ids, window_start, window_end required.' },
      { status: 400 }
    )
  }

  const windowStart = new Date(window_start).toISOString()
  const windowEnd = new Date(window_end).toISOString()

  if (isNaN(new Date(windowStart).getTime()) || isNaN(new Date(windowEnd).getTime())) {
    return NextResponse.json(
      { error: 'window_start and window_end must be valid ISO date strings.' },
      { status: 400 }
    )
  }

  if (new Date(windowEnd) <= new Date(windowStart)) {
    return NextResponse.json({ error: 'window_end must be after window_start.' }, { status: 400 })
  }

  const { rows: testRows } = await db.query('SELECT status FROM tests WHERE id=$1', [test_id])
  if (!testRows[0] || testRows[0].status !== 'published') {
    return NextResponse.json({ error: 'Test must be published before assigning.' }, { status: 400 })
  }

  const created = []
  let skipped = 0

  for (const empId of employee_ids) {
    const { rows } = await db.query(
      `INSERT INTO test_assignments (employee_id, test_id, window_start, window_end, assigned_by, status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       ON CONFLICT (employee_id, test_id) DO UPDATE SET
         window_start = EXCLUDED.window_start,
         window_end = EXCLUDED.window_end,
         assigned_by = EXCLUDED.assigned_by,
         status = CASE
           WHEN test_assignments.status IN ('submitted','auto_submitted') THEN test_assignments.status
           ELSE 'pending'
         END
       RETURNING *, (xmax = 0) as inserted`,
      [empId, test_id, windowStart, windowEnd, adminId]
    )
    if (rows[0].inserted) created.push(rows[0])
    else skipped++
  }

  return NextResponse.json({ created: created.length, skipped }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const test_id = searchParams.get('test_id')
  const employee_id = searchParams.get('employee_id')

  let where = 'WHERE 1=1'
  const params: any[] = []
  let i = 1
  if (test_id) { where += ` AND ta.test_id=$${i++}`; params.push(test_id) }
  if (employee_id) { where += ` AND ta.employee_id=$${i++}`; params.push(employee_id) }

  const { rows } = await db.query(
    `SELECT ta.*, e.name as employee_name, e.department, t.title as test_title
     FROM test_assignments ta
     JOIN employees e ON e.id = ta.employee_id
     JOIN tests t ON t.id = ta.test_id
     ${where} ORDER BY ta.assigned_at DESC`,
    params
  )
  return NextResponse.json({ assignments: rows })
}
