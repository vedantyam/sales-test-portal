export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error

  const { rows: folders } = await db.query(
    'SELECT * FROM resource_folders ORDER BY name ASC'
  )

  const { rows: resources } = await db.query(
    'SELECT id, title, description, url, category, folder_id, created_at FROM resources ORDER BY created_at DESC'
  )

  const foldersWithResources = folders.map((folder: any) => ({
    ...folder,
    resources: resources.filter((r: any) => r.folder_id === folder.id),
  }))

  const uncategorized = resources.filter((r: any) => !r.folder_id)

  return NextResponse.json({ folders: foldersWithResources, uncategorized })
}
