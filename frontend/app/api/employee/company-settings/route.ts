export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `SELECT signature_image_url FROM company_settings LIMIT 1`
  )

  return NextResponse.json({ signature_image_url: rows[0]?.signature_image_url || null })
}
