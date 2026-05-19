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
    'SELECT id, title, description, url, category, created_at FROM resources ORDER BY created_at DESC'
  )
  return NextResponse.json({ resources: rows })
}
