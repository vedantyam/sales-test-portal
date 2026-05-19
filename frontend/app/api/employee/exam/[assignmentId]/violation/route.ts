export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: { assignmentId: string } }) {
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  const employeeId = auth.user!.sub
  const { assignmentId } = params

  const body = await request.json().catch(() => ({}))
  const { type, count } = body as { type?: string; count?: number }

  const { rows } = await db.query(
    `SELECT ta.status FROM test_assignments ta WHERE ta.id=$1 AND ta.employee_id=$2`,
    [assignmentId, employeeId]
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  await db.query(
    `UPDATE test_sessions
     SET tab_switch_count = COALESCE($1, tab_switch_count + 1),
         violations = violations || $2::jsonb
     WHERE assignment_id=$3`,
    [
      count ?? null,
      JSON.stringify([{ type: type || 'tab_switch', at: new Date().toISOString() }]),
      assignmentId,
    ]
  )

  return NextResponse.json({ recorded: true })
}
