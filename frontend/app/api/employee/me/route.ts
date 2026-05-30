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

  const { rows } = await db.query(
    'SELECT id, name, email, department, phone, joining_date FROM employees WHERE id = $1 AND tenant_id IS NULL',
    [auth.user!.sub]
  )
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ employee: rows[0] })
}

export async function PATCH(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { phone } = await request.json().catch(() => ({}))

  if (phone && !/^[0-9\s+\-()]{7,15}$/.test(phone.trim())) {
    return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 })
  }

  await db.query(
    'UPDATE employees SET phone = $1 WHERE id = $2 AND tenant_id IS NULL',
    [phone?.trim() || null, auth.user!.sub]
  )
  return NextResponse.json({ ok: true })
}
