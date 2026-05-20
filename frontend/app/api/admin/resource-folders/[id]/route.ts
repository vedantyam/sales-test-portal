export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    'SELECT COUNT(*) FROM resources WHERE folder_id = $1',
    [params.id]
  )
  if (Number(rows[0].count) > 0) {
    return NextResponse.json(
      { error: 'Folder is not empty. Move or delete files first.' },
      { status: 403 }
    )
  }

  await db.query('DELETE FROM resource_folders WHERE id = $1', [params.id])
  return NextResponse.json({ deleted: true })
}
