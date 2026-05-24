export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub

  const { rows } = await db.query(
    `SELECT * FROM quotations WHERE id = $1 AND employee_id = $2`,
    [params.id, employeeId]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ quotation: rows[0] })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub

  const { rows } = await db.query(
    `SELECT id FROM quotations WHERE id = $1 AND employee_id = $2`,
    [params.id, employeeId]
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const { action, details } = body

  await db.query(
    `INSERT INTO quotation_activity_logs (employee_id, quotation_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [employeeId, params.id, action || 'updated', JSON.stringify(details || {})]
  )

  return NextResponse.json({ ok: true })
}
