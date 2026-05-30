export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureMigrated } from '@/lib/migrate'
import { generateLeaderboardImage } from '@/lib/generateLeaderboardImage'

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
    const token = process.env.SLACK_BOT_TOKEN
    const channelId = process.env.SLACK_CHANNEL_ID || 'C0B79PG8UE8'

    if (!token) {
      return NextResponse.json({ error: 'SLACK_BOT_TOKEN not set' }, { status: 500 })
    }

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

    // Try image upload
    let imageBuffer: Buffer | null = null
    try {
      imageBuffer = await generateLeaderboardImage(
        report.sales_team || [],
        report.enterprise_team || [],
        report.team_total || {},
        report.report_type || '6PM',
        report.report_date?.toString() || ''
      )
      console.log('Image generated, size:', imageBuffer.length)
    } catch (e: any) {
      console.error('Image generation failed:', e.message)
    }

    if (imageBuffer) {
      // Step 1: Get upload URL (must be form-encoded)
      const rawDate = report.report_date?.toString() || 'today'
      const safeDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
      const uploadParams = new URLSearchParams()
      uploadParams.append('filename', `leaderboard_${safeDate}_${report.report_type}.png`)
      uploadParams.append('length', String(imageBuffer.length))

      const urlRes = await fetch('https://slack.com/api/files.getUploadURLExternal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: uploadParams,
      })
      const urlData = await urlRes.json()
      console.log('Upload URL response:', JSON.stringify(urlData))

      if (urlData.ok) {
        // Step 2: Upload file bytes
        const uploadRes = await fetch(urlData.upload_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new Uint8Array(imageBuffer),
        })
        console.log('Upload status:', uploadRes.status)

        // Step 3: Complete upload → post to channel
        const top3 = (report.sales_team || []).slice(0, 3)
        const comment = [
          `📊 *Daily Call Leaderboard — ${report.report_type} Update*`,
          dateDisplay,
          top3.map((m: any, i: number) => ['🥇', '🥈', '🥉'][i] + ` ${m.name} (${m.all_calls} calls)`).join('  '),
          `Total: ${report.team_total?.total_calls || 0} calls | Avg Connect: ${report.team_total?.avg_connect_percent || 0}%`,
        ].join('\n')

        const completeRes = await fetch('https://slack.com/api/files.completeUploadExternal', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: [{ id: urlData.file_id }],
            channel_id: channelId,
            initial_comment: comment,
          }),
        })
        const completeData = await completeRes.json()
        console.log('Complete upload response:', JSON.stringify(completeData))

        if (completeData.ok) {
          return NextResponse.json({ success: true, method: 'image' })
        }
        console.error('Complete upload failed:', completeData.error)
      } else {
        console.error('Get upload URL failed:', urlData.error)
      }
    }

    // Fallback: text blocks with ALL members
    const medals = ['🥇', '🥈', '🥉']
    const allSalesRows = (report.sales_team || []).map((m: any, i: number) => {
      const prefix = i < 3 ? medals[i] : `${i + 1}.`
      return `${prefix} *${m.name}* — ${m.all_calls} calls | ${m.connected} connected | ${m.connect_percent}% | ${m.status}`
    }).join('\n')

    const enterpriseRows = (report.enterprise_team || []).map((m: any, i: number) => {
      const prefix = medals[i] || `${i + 1}.`
      return `${prefix} *${m.name}* — ${m.all_calls} calls | ${m.connected} connected | ${m.connect_percent}%`
    }).join('\n')

    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: `📊 Daily Call Leaderboard — ${report.report_type} Update` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*${dateDisplay}*` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*🏢 Sales Team*\n${allSalesRows || 'No data'}` } },
    ]
    if (enterpriseRows) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*🎯 Enterprise Team*\n${enterpriseRows}` } })
    }
    blocks.push(
      { type: 'section', text: { type: 'mrkdwn', text: `*Team Summary*\nTotal: ${report.team_total?.total_calls || 0} calls | Connected: ${report.team_total?.connected || 0} | Avg Connect: ${report.team_total?.avg_connect_percent || 0}%` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '⚡ flabs · diagnoshuttle private limited' }] }
    )

    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channelId,
        text: `📊 Daily Call Leaderboard — ${report.report_type} Update`,
        blocks,
      }),
    })
    const slackData = await slackRes.json()
    console.log('Fallback text Slack response:', JSON.stringify(slackData))

    if (!slackData.ok) {
      return NextResponse.json({ error: 'Slack error: ' + slackData.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, method: 'text' })

  } catch (e: any) {
    console.error('send-slack FATAL:', e.message, e.stack)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
