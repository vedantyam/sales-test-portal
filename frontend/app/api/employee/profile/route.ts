export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub

  const { rows } = await db.query(
    `SELECT display_name, email FROM salesperson_profiles WHERE employee_id = $1`,
    [employeeId]
  )

  return NextResponse.json({ profile: rows[0] || null })
}

export async function PUT(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub

  const body = await request.json().catch(() => ({}))
  const { display_name, email } = body

  await db.query(
    `INSERT INTO salesperson_profiles (employee_id, display_name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (employee_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       email = EXCLUDED.email,
       updated_at = now()`,
    [employeeId, display_name || null, email || null]
  )

  return NextResponse.json({ ok: true })
}
