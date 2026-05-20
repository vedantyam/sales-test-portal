export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    'SELECT id, title, description, url, category, folder_id, created_at FROM resources ORDER BY created_at DESC'
  )
  return NextResponse.json({ resources: rows })
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { title, description, url, external_url, category, file_type, folder_id } = body
  const adminId = auth.user!.sub

  const resourceUrl = url || external_url
  const resourceCategory = category || file_type

  if (!title?.trim() || !resourceUrl?.trim()) {
    return NextResponse.json({ error: 'Title and URL are required.' }, { status: 400 })
  }

  try {
    new URL(resourceUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
  }

  const { rows } = await db.query(
    `INSERT INTO resources (title, description, url, category, folder_id, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, description, url, category, folder_id, created_at`,
    [title.trim(), description?.trim() || null, resourceUrl.trim(), resourceCategory?.trim() || null, folder_id || null, adminId]
  )
  return NextResponse.json({ resource: rows[0] }, { status: 201 })
}
