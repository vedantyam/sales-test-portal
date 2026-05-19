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
    'SELECT id, title, description, url, category, created_at FROM resources ORDER BY created_at DESC'
  )
  return NextResponse.json({ resources: rows })
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { title, description, url, category } = body
  const adminId = auth.user!.sub

  if (!title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'Title and URL are required.' }, { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
  }

  const { rows } = await db.query(
    `INSERT INTO resources (title, description, url, category, uploaded_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, title, description, url, category, created_at`,
    [title.trim(), description?.trim() || null, url.trim(), category?.trim() || null, adminId]
  )
  return NextResponse.json({ resource: rows[0] }, { status: 201 })
}
