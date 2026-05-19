export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: { testId: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error
  const adminId = auth.user!.sub

  const { rows } = await db.query(
    `UPDATE results
     SET is_released = true, released_at = NOW(), released_by = $1
     WHERE test_id = $2
       AND is_finalised = true
       AND is_released = false
     RETURNING id`,
    [adminId, params.testId]
  )

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'No finalised results to release. Finalise all scores first.' },
      { status: 400 }
    )
  }

  return NextResponse.json({ released_count: rows.length })
}
