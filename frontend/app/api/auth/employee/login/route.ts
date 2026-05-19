export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAccessKey } from '@/lib/accessKey'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { ensureMigrated } from '@/lib/migrate'

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const body = await request.json().catch(() => ({}))
  const { access_key } = body

  if (!access_key?.trim()) {
    return NextResponse.json({ error: 'Access key is required.' }, { status: 400 })
  }

  const key = (access_key as string).trim().toUpperCase()
  const prefix = key.substring(0, 4)

  const { rows: candidates } = await db.query(
    `SELECT id, name, department, joining_date, access_key_hash
     FROM employees WHERE access_key_prefix = $1 AND is_active = true`,
    [prefix]
  )

  let matched: any = null
  for (const emp of candidates) {
    if (await verifyAccessKey(key, emp.access_key_hash)) {
      matched = emp
      break
    }
  }

  if (!matched) {
    logAudit({
      action: 'employee_login_failed',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      user_agent: request.headers.get('user-agent') || undefined,
    })
    return NextResponse.json({ error: 'Invalid access key. Please check with HR.' }, { status: 401 })
  }

  const accessToken = signAccessToken({
    sub: matched.id,
    role: 'employee',
    name: matched.name,
    department: matched.department,
  })
  const refreshToken = signRefreshToken({ sub: matched.id, role: 'employee' })

  logAudit({
    user_id: matched.id,
    user_type: 'employee',
    action: 'employee_login_success',
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || undefined,
  })

  const response = NextResponse.json({
    access_token: accessToken,
    employee: {
      id: matched.id,
      name: matched.name,
      department: matched.department,
      joining_date: matched.joining_date,
    },
  })

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
