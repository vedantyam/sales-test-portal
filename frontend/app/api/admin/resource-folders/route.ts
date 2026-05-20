export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query('SELECT * FROM resource_folders ORDER BY name ASC')
  return NextResponse.json({ folders: rows })
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { name } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Folder name required' }, { status: 400 })
  }

  const adminId = auth.user!.sub
  const { rows } = await db.query(
    'INSERT INTO resource_folders (name, created_by) VALUES ($1, $2) RETURNING *',
    [name.trim(), adminId]
  )
  return NextResponse.json({ folder: rows[0] }, { status: 201 })
}
