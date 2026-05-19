export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await db.query('SELECT 1')
    return NextResponse.json({ ok: true, db: 'connected' })
  } catch {
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503 })
  }
}
