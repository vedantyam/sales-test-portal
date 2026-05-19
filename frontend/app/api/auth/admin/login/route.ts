export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { ensureMigrated } from '@/lib/migrate'

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const body = await request.json().catch(() => ({}))
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required.' }, { status: 400 })
  }

  const { rows } = await db.query(
    'SELECT id, name, email, password_hash FROM admins WHERE email = $1',
    [(email as string).toLowerCase().trim()]
  )

  const admin = rows[0]
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const accessToken = signAccessToken({
    sub: admin.id,
    role: 'admin',
    name: admin.name,
    email: admin.email,
  })
  const refreshToken = signRefreshToken({ sub: admin.id, role: 'admin' })

  logAudit({
    user_id: admin.id,
    user_type: 'admin',
    action: 'admin_login_success',
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || undefined,
  })

  const response = NextResponse.json({
    access_token: accessToken,
    admin: { id: admin.id, name: admin.name, email: admin.email },
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
