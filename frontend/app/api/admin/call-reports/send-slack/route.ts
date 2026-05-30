export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureMigrated } from '@/lib/migrate'

export async function POST(request: NextRequest) {
  try {
    await ensureMigrated()
    const auth = requireAdmin(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const reportId = body.report_id

    if (!reportId) {
      return NextResponse.json({ error: 'report_id required' }, { status: 400 })
    }

    const { rows } = await db.query('SELECT * FROM call_reports WHERE id = $1', [reportId])
    if (!rows[0]) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const report = rows[0]
    const salesTeam: any[] = report.sales_team || []
    const enterpriseTeam: any[] = report.enterprise_team || []
    const teamTotal: any = report.team_total || {}
    const reportType: string = report.report_type || '6PM'

    let dateDisplay = 'Today'
    try {
      const raw = report.report_date?.toString() || ''
      const dateStr = raw.includes('T') ? raw.split('T')[0] : raw
      if (dateStr) {
        dateDisplay = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
      }
    } catch (e) {
      console.error('Date parse error:', e)
    }

    const token = process.env.SLACK_BOT_TOKEN
    const channelId = process.env.SLACK_CHANNEL_ID || 'C0B79PG8UE8'

    if (!token) {
      return NextResponse.json({ error: 'SLACK_BOT_TOKEN not set in environment' }, { status: 500 })
    }

    const medals = ['🥇', '🥈', '🥉']

    const salesRows = salesTeam.slice(0, 10).map((m: any, i: number) => {
      const prefix = i < 3 ? medals[i] : `${i + 1}.`
      return `${prefix} *${m.name}* — ${m.all_calls} calls | ${m.connected} connected | ${m.connect_percent}% | ${m.status}`
    }).join('\n')

    const enterpriseRows = enterpriseTeam.map((m: any, i: number) => {
      const prefix = i < 3 ? medals[i] : `${i + 1}.`
      return `${prefix} *${m.name}* — ${m.all_calls} calls | ${m.connected} connected | ${m.connect_percent}%`
    }).join('\n')

    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📊 Daily Call Leaderboard — ${reportType} Update` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${dateDisplay}*` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*🏢 Sales Team*\n${salesRows || 'No data'}` }
      }
    ]

    if (enterpriseTeam.length > 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*🎯 Enterprise Team*\n${enterpriseRows}` }
      })
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Team Summary*\nTotal Calls: ${teamTotal.total_calls || 0} | Connected: ${teamTotal.connected || 0} | Duration: ${teamTotal.duration_min || 0} min | Avg Connect: ${teamTotal.avg_connect_percent || 0}%`
      }
    })

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '⚡ flabs · diagnoshuttle private limited' }]
    })

    console.log('Posting to Slack channel:', channelId)

    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: `📊 Daily Call Leaderboard — ${reportType} Update | ${dateDisplay}`,
        blocks,
      }),
    })

    const slackData = await slackRes.json()
    console.log('Slack response:', JSON.stringify(slackData))

    if (!slackData.ok) {
      return NextResponse.json(
        { error: `Slack API error: ${slackData.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (e: any) {
    console.error('send-slack FATAL error:', e.message, e.stack)
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
