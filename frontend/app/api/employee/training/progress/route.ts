export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const employeeId = auth.user!.sub

  const body = await request.json().catch(() => ({}))
  const { topicId } = body as { topicId?: string }

  if (!topicId || !UUID_RE.test(topicId)) {
    return NextResponse.json({ error: 'Invalid topicId' }, { status: 400 })
  }

  await db.query(
    `INSERT INTO training_progress (employee_id, topic_id)
     VALUES ($1, $2)
     ON CONFLICT (employee_id, topic_id) DO NOTHING`,
    [employeeId, topicId]
  )

  return NextResponse.json({ success: true })
}
