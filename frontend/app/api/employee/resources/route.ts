export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rows: folders } = await db.query(
    'SELECT * FROM resource_folders WHERE tenant_id IS NULL ORDER BY name ASC'
  )

  const { rows: resources } = await db.query(
    'SELECT id, title, description, url, category, folder_id, created_at FROM resources WHERE tenant_id IS NULL ORDER BY created_at DESC'
  )

  const foldersWithResources = folders.map((folder: any) => ({
    ...folder,
    resources: resources.filter((r: any) => r.folder_id === folder.id),
  }))

  const uncategorized = resources.filter((r: any) => !r.folder_id)

  return NextResponse.json({ folders: foldersWithResources, uncategorized })
}
