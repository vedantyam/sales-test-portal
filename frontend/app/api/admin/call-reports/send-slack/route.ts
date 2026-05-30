export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateSlackBlocks } from '@/lib/generateLeaderboardPng'
import { postToSlackBlocks } from '@/lib/slack'
import { ensureMigrated } from '@/lib/migrate'

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { report_id } = await request.json()

  const { rows } = await db.query('SELECT * FROM call_reports WHERE id = $1', [report_id])
  if (!rows[0]) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const report = rows[0]
  const blocks = generateSlackBlocks(
    report.sales_team, report.enterprise_team, report.team_total,
    report.report_type, report.report_date
  )

  const success = await postToSlackBlocks(blocks, report.report_type, report.report_date)
  return NextResponse.json({ success })
}
