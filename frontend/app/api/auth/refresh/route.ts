import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('refresh_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'No refresh token.' }, { status: 401 })
  }

  try {
    const payload = verifyRefreshToken(token)
    if (payload.type !== 'refresh') throw new Error('Invalid token type')

    const accessToken = signAccessToken({
      sub: payload.sub,
      role: payload.role,
      name: payload.name,
      department: payload.department,
      email: payload.email,
    })

    return NextResponse.json({ access_token: accessToken })
  } catch {
    return NextResponse.json({ error: 'Invalid or expired refresh token.' }, { status: 401 })
  }
}
