export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateAccessKey, getKeyPrefix, hashAccessKey } from '@/lib/accessKey'
import { sendAccessKeyEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') || 1)
  const limit = Number(searchParams.get('limit') || 50)
  const search = searchParams.get('search') || ''
  const department = searchParams.get('department') || ''
  const offset = (page - 1) * limit

  let where = 'WHERE tenant_id IS NULL'
  const params: unknown[] = []
  let i = 1

  if (search) {
    where += ` AND (name ILIKE $${i} OR email ILIKE $${i})`
    params.push(`%${search}%`)
    i++
  }
  if (department) {
    where += ` AND department = $${i++}`
    params.push(department)
  }

  const { rows } = await db.query(
    `SELECT id, name, email, department, joining_date, is_active, created_at
     FROM employees ${where}
     ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  )

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM employees ${where}`,
    params
  )

  return NextResponse.json({ employees: rows, total: Number(countRows[0].count) })
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { name, email, department, joining_date } = body
  const adminId = auth.user!.sub

  if (!name?.trim() || !department?.trim()) {
    return NextResponse.json({ error: 'Name and department are required.' }, { status: 400 })
  }

  const key = generateAccessKey()
  const hash = await hashAccessKey(key)
  const prefix = getKeyPrefix(key)

  const { rows } = await db.query(
    `INSERT INTO employees (name, email, department, joining_date, access_key_hash, access_key_prefix, access_key_plain, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, name, email, department, joining_date, is_active, created_at, access_key_plain`,
    [name.trim(), email?.trim() || null, department.trim(), joining_date || null, hash, prefix, key, adminId]
  )

  if (email?.trim()) {
    sendAccessKeyEmail(email.trim(), name.trim(), key)
  }

  logAudit({
    user_id: adminId,
    user_type: 'admin',
    action: 'employee_created',
    resource: 'employees',
    resource_id: rows[0].id,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
  })

  return NextResponse.json({ employee: rows[0], access_key: key }, { status: 201 })
}
