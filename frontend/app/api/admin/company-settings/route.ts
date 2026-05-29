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

  const { rows: existing } = await db.query(
    `SELECT id, signature_image_url, logo_image_url FROM company_settings LIMIT 1`
  )

  const current = existing[0]
  const newSig = 'signature_image_url' in body ? (body.signature_image_url ?? null) : (current?.signature_image_url ?? null)
  const newLogo = 'logo_image_url' in body ? (body.logo_image_url ?? null) : (current?.logo_image_url ?? null)
  const newSignatoryName = 'signatory_name' in body ? (body.signatory_name ?? null) : (current?.signatory_name ?? null)
  const newSignatoryDesignation = 'signatory_designation' in body ? (body.signatory_designation ?? null) : (current?.signatory_designation ?? null)

  if (current) {
    await db.query(
      `UPDATE company_settings SET signature_image_url = $1, logo_image_url = $2, signatory_name = $3, signatory_designation = $4, updated_at = now() WHERE id = $5`,
      [newSig, newLogo, newSignatoryName, newSignatoryDesignation, current.id]
    )
  } else {
    await db.query(
      `INSERT INTO company_settings (signature_image_url, logo_image_url, signatory_name, signatory_designation) VALUES ($1, $2, $3, $4)`,
      [newSig, newLogo, newSignatoryName, newSignatoryDesignation]
    )
  }

  return NextResponse.json({ ok: true })
}
