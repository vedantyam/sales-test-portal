export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(`SELECT * FROM company_settings LIMIT 1`)
  return NextResponse.json({ settings: rows[0] || null })
}

export async function PUT(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { signature_image_url } = body

  const { rows: existing } = await db.query(`SELECT id FROM company_settings LIMIT 1`)

  if (existing[0]) {
    await db.query(
      `UPDATE company_settings SET signature_image_url = $1, updated_at = now() WHERE id = $2`,
      [signature_image_url || null, existing[0].id]
    )
  } else {
    await db.query(
      `INSERT INTO company_settings (signature_image_url) VALUES ($1)`,
      [signature_image_url || null]
    )
  }

  return NextResponse.json({ ok: true })
}
