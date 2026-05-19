export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error
  const adminId = auth.user!.sub

  const body = await request.json().catch(() => ({}))
  const { decision, notes } = body

  if (!decision) return NextResponse.json({ error: 'Decision is required.' }, { status: 400 })

  const { rows: resultRows } = await db.query(
    'SELECT id, employee_id, is_finalised FROM results WHERE id=$1',
    [params.id]
  )
  if (!resultRows[0]) return NextResponse.json({ error: 'Result not found.' }, { status: 404 })
  if (!resultRows[0].is_finalised) {
    return NextResponse.json({ error: 'Finalise result before recording decision.' }, { status: 403 })
  }

  const { rows } = await db.query(
    `INSERT INTO hr_decisions (result_id, employee_id, decision, notes, decided_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, decision, notes, created_at`,
    [params.id, resultRows[0].employee_id, decision, notes?.trim() || null, adminId]
  )

  logAudit({
    user_id: adminId,
    user_type: 'admin',
    action: 'hr_decision_recorded',
    resource: 'hr_decisions',
    resource_id: rows[0].id,
    metadata: { decision },
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
  })

  return NextResponse.json({ decision: rows[0] }, { status: 201 })
}
