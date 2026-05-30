export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'
import { generateDummyData } from '@/lib/processCallData'
import { generateSlackBlocks } from '@/lib/generateLeaderboardPng'
import { postToSlackBlocks } from '@/lib/slack'

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))

  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]

  const reportType: string = body.report_type || '6PM'
  const reportDate: string = body.report_date || todayIST

  const processed = generateDummyData(reportType)

  const { rows } = await db.query(
    `INSERT INTO call_reports (report_date, report_type, sales_team, enterprise_team, low_performers, team_total, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (report_date, report_type) DO UPDATE SET
       sales_team = EXCLUDED.sales_team,
       enterprise_team = EXCLUDED.enterprise_team,
       low_performers = EXCLUDED.low_performers,
       team_total = EXCLUDED.team_total,
       raw_data = EXCLUDED.raw_data,
       created_at = NOW()
     RETURNING *`,
    [
      reportDate,
      reportType,
      JSON.stringify(processed.sales_team),
      JSON.stringify(processed.enterprise_team),
      JSON.stringify(processed.low_performers),
      JSON.stringify(processed.team_total),
      JSON.stringify({ source: 'test_sample' }),
    ]
  )

  const slackBlocks = generateSlackBlocks(
    processed.sales_team,
    processed.enterprise_team,
    processed.team_total,
    reportType,
    reportDate
  )
  await postToSlackBlocks(slackBlocks, reportType, reportDate)

  return NextResponse.json({ success: true, report: rows[0] })
}
