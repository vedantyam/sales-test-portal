import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { processCallData, generateDummyData } from '@/lib/processCallData'
import { generateSlackBlocks } from '@/lib/generateLeaderboardPng'
import { postToSlackBlocks } from '@/lib/slack'
import { ensureMigrated } from '@/lib/migrate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production') {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  await ensureMigrated()

  try {
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istTime = new Date(now.getTime() + istOffset)
    const istHour = istTime.getUTCHours()
    const reportType = istHour < 15 ? '1PM' : '6PM'

    const reportDate = istTime.toISOString().split('T')[0]

    const formData = new URLSearchParams()
    formData.append('authcode', process.env.CALLERDESK_AUTH_CODE || '488c0a6fb260078995f00c556cbb6544')
    formData.append('date', reportDate)

    let rawData: any = null

    try {
      const callerDeskRes = await fetch('https://app.callerdesk.io/api/get-count-v2', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      rawData = await callerDeskRes.json()
    } catch (e) {
      console.error('CallerDesk API error:', e)
    }

    const hasRealData = rawData?.member_analysis?.length > 0
    const processed = hasRealData ? processCallData(rawData) : generateDummyData(reportType)

    await db.query(
      `INSERT INTO call_reports (report_date, report_type, sales_team, enterprise_team, low_performers, team_total, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (report_date, report_type) DO UPDATE SET
         sales_team = EXCLUDED.sales_team,
         enterprise_team = EXCLUDED.enterprise_team,
         low_performers = EXCLUDED.low_performers,
         team_total = EXCLUDED.team_total,
         raw_data = EXCLUDED.raw_data,
         created_at = NOW()`,
      [
        reportDate,
        reportType,
        JSON.stringify(processed.sales_team),
        JSON.stringify(processed.enterprise_team),
        JSON.stringify(processed.low_performers),
        JSON.stringify(processed.team_total),
        JSON.stringify(rawData),
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

    return NextResponse.json({
      success: true,
      report_type: reportType,
      report_date: reportDate,
      has_real_data: hasRealData,
      sales_team_count: processed.sales_team.length,
      enterprise_team_count: processed.enterprise_team.length,
    })
  } catch (e: any) {
    console.error('Cron error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
