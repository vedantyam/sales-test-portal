export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureMigrated } from '@/lib/migrate'
import bcrypt from 'bcrypt'

const SEED_SECRET = 'SeedSalesPortal2024'

export async function POST(request: NextRequest) {
  if (request.headers.get('x-seed-secret') !== SEED_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await ensureMigrated()

  const email = process.env.SEED_ADMIN_EMAIL || 'mvedant246@gmail.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'Vedant@2024'
  const name = process.env.SEED_ADMIN_NAME || 'Vedant Mishra'

  const { rows: existing } = await db.query(
    'SELECT id FROM admins WHERE email = $1',
    [email.toLowerCase()]
  )

  if (existing[0]) {
    return NextResponse.json({ seeded: false, message: 'Admin already exists', email })
  }

  const hash = await bcrypt.hash(password, 12)
  await db.query(
    'INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3)',
    [name, email.toLowerCase(), hash]
  )

  return NextResponse.json({ seeded: true, email })
}
