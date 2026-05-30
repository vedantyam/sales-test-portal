export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'
import { getStatus, nameMatches, LOW_PERFORMER_WATCHLIST } from '@/lib/callReportConfig'
import { generateSlackBlocks } from '@/lib/generateLeaderboardPng'
import { postToSlackBlocks } from '@/lib/slack'

const SALES_NAMES = [
  'Aditya Kumar', 'Hima', 'Shreya', 'Pramila Kanwar', 'Neha Singh',
  'Shivanand Dubey', 'Pawan Kumar Singh', 'Neha', 'Shivam Rai',
  'Aavya Tyagi', 'AbhiLove Chauhan', 'Akanksha', 'Prachi Singh',
  'Saurabh Prashar', 'Ritik Gupta', 'Ravi Ranjan Singh', 'Nikita Jaiswal',
  'Harsh Pandey', 'Gulshan', 'Kunal',
]

const ENTERPRISE_NAMES = ['Shreyansh', 'Rajat', 'Sanjay']

// Seeded pseudo-random so data looks realistic but reproducible per name
function seededRand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000
  const r = x - Math.floor(x)
  return Math.floor(r * (max - min + 1)) + min
}

function buildMember(name: string, idx: number, isEnterprise: boolean) {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), idx)
  const allCalls = isEnterprise
    ? seededRand(seed, 20, 80)
    : seededRand(seed, 30, 150)
  const connectPct = seededRand(seed + 1, 20, 60) / 100
  const connected = Math.round(allCalls * connectPct)
  const durationMin = connected * seededRand(seed + 2, 2, 4)
  const missed = allCalls - connected
  const connectPercent = allCalls > 0 ? Math.round((connected / allCalls) * 1000) / 10 : 0

  return {
    rank: 0,
    name,
    all_calls: allCalls,
    connected,
    duration_min: durationMin,
    connect_percent: connectPercent,
    missed,
    status: getStatus(connectPercent, connected),
    is_low_performer: nameMatches(name, LOW_PERFORMER_WATCHLIST),
  }
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const reportDate = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const reportType = '6PM'

  const salesTeam = SALES_NAMES
    .map((name, i) => buildMember(name, i, false))
    .sort((a, b) => b.all_calls - a.all_calls)
    .map((m, i) => ({ ...m, rank: i + 1 }))

  const enterpriseTeam = ENTERPRISE_NAMES
    .map((name, i) => buildMember(name, i + 100, true))
    .sort((a, b) => b.all_calls - a.all_calls)
    .map((m, i) => ({ ...m, rank: i + 1 }))

  const lowPerformers = salesTeam.filter(m => m.is_low_performer)

  const totalCalls = salesTeam.reduce((s, m) => s + m.all_calls, 0)
  const totalConnected = salesTeam.reduce((s, m) => s + m.connected, 0)
  const teamTotal = {
    total_calls: totalCalls,
    connected: totalConnected,
    duration_min: salesTeam.reduce((s, m) => s + m.duration_min, 0),
    avg_connect_percent: totalCalls > 0 ? Math.round((totalConnected / totalCalls) * 1000) / 10 : 0,
    missed: salesTeam.reduce((s, m) => s + m.missed, 0),
  }

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
      JSON.stringify(salesTeam),
      JSON.stringify(enterpriseTeam),
      JSON.stringify(lowPerformers),
      JSON.stringify(teamTotal),
      JSON.stringify({ source: 'test_sample' }),
    ]
  )

  const slackBlocks = generateSlackBlocks(salesTeam, enterpriseTeam, teamTotal, reportType, reportDate)
  await postToSlackBlocks(slackBlocks, reportType, reportDate)

  return NextResponse.json({ success: true, report: rows[0] })
}
