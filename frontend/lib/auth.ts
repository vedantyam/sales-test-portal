import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export interface JWTPayload {
  sub: string
  role: 'admin' | 'employee'
  name?: string
  department?: string
  email?: string
  type?: string
}

export function signAccessToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' })
}

export function signRefreshToken(payload: Pick<JWTPayload, 'sub' | 'role'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload
}

type AuthSuccess = { user: JWTPayload; error?: never }
type AuthError = { user?: never; error: NextResponse }

export function getAuthUser(request: NextRequest): AuthSuccess | AuthError {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  try {
    const user = verifyAccessToken(authHeader.slice(7))
    return { user }
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}

export function requireAdmin(request: NextRequest): AuthSuccess | AuthError {
  const result = getAuthUser(request)
  if (result.error) return result
  if (result.user!.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return result
}
