import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync } from 'fs'
import { join } from 'path'

function getFont(): Buffer | null {
  // Use fontsource Inter woff (woff1, satori-compatible)
  try {
    const fontPath = join(process.cwd(), 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-400-normal.woff')
    return readFileSync(fontPath)
  } catch {}
  return null
}

interface Member {
  rank: number
  name: string
  all_calls: number
  connected: number
  duration_min: number
  connect_percent: number
  missed: number
  status: string
  is_low_performer?: boolean
}

function statusColor(status: string): string {
  if (status === 'Excellent') return '#60a5fa'
  if (status === 'Good') return '#4ade80'
  return '#f87171'
}

function statusBg(status: string): string {
  if (status === 'Excellent') return '#1e3a5f'
  if (status === 'Good') return '#14532d'
  return '#7f1d1d'
}

function connectColor(pct: number): string {
  if (pct >= 50) return '#60a5fa'
  if (pct >= 25) return '#4ade80'
  return '#f87171'
}

function rankDisplay(rank: number): string {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `#${rank}`
}

function MemberRow(member: Member, index: number) {
  const isLow = member.is_low_performer
  const bg = index % 2 === 0 ? '#1e2128' : '#22262e'
  const rowBg = isLow ? '#2d1515' : bg

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        background: rowBg,
        borderBottom: '1px solid #2a2d35',
        width: '100%',
      },
      children: [
        { type: 'div', props: { style: { width: 50, textAlign: 'center' as const, fontSize: 12, color: '#94a3b8', padding: '8px 4px' }, children: rankDisplay(member.rank) } },
        { type: 'div', props: { style: { width: 160, fontSize: 11, color: isLow ? '#fca5a5' : '#f1f5f9', fontWeight: 500, padding: '8px 6px' }, children: member.name + (isLow ? ' !' : '') } },
        { type: 'div', props: { style: { width: 70, textAlign: 'center' as const, fontSize: 12, color: '#94a3b8', padding: '8px 4px' }, children: String(member.all_calls) } },
        { type: 'div', props: { style: { width: 80, textAlign: 'center' as const, fontSize: 12, color: '#4ade80', fontWeight: 600, padding: '8px 4px' }, children: String(member.connected) } },
        { type: 'div', props: { style: { width: 90, textAlign: 'center' as const, fontSize: 12, color: '#94a3b8', padding: '8px 4px' }, children: String(member.duration_min) } },
        { type: 'div', props: { style: { width: 80, textAlign: 'center' as const, fontSize: 12, color: connectColor(member.connect_percent), fontWeight: 600, padding: '8px 4px' }, children: member.connect_percent + '%' } },
        { type: 'div', props: { style: { width: 65, textAlign: 'center' as const, fontSize: 12, color: member.missed > 0 ? '#f87171' : '#94a3b8', padding: '8px 4px' }, children: String(member.missed) } },
        {
          type: 'div',
          props: {
            style: { width: 80, display: 'flex', justifyContent: 'center' as const, padding: '8px 4px' },
            children: {
              type: 'div',
              props: {
                style: { background: statusBg(member.status), color: statusColor(member.status), fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3 },
                children: member.status,
              }
            }
          }
        },
      ]
    }
  }
}

function TeamSection(title: string, members: Member[]) {
  const colWidths = [50, 160, 70, 80, 90, 80, 65, 80]
  const colLabels = ['Rank', 'Name', 'All Calls', 'Connected', 'Dur(min)', 'Connect%', 'Missed', 'Status']

  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column' as const, width: '100%', marginBottom: 10 },
      children: [
        {
          type: 'div',
          props: {
            style: { background: '#2563EB', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: 'white', borderRadius: '5px 5px 0 0' },
            children: title,
          }
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'row' as const, background: '#252930', borderBottom: '1px solid rgba(255,255,255,0.1)' },
            children: colLabels.map((col, i) => ({
              type: 'div',
              props: {
                style: { width: colWidths[i], fontSize: 9, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', padding: '6px 4px', textAlign: i === 1 ? 'left' as const : 'center' as const },
                children: col.toUpperCase(),
              }
            }))
          }
        },
        ...members.map((m, i) => MemberRow(m, i)),
      ]
    }
  }
}

export async function generateLeaderboardImage(
  salesTeam: Member[],
  enterpriseTeam: Member[],
  teamTotal: any,
  reportType: string,
  reportDate: string
): Promise<Buffer> {
  let dateDisplay = 'Today'
  try {
    const raw = reportDate?.toString() || ''
    const dateStr = raw.includes('T') ? raw.split('T')[0] : raw
    if (dateStr) {
      dateDisplay = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    }
  } catch {}

  const rowH = 34
  const teamH = 28
  const colH = 26
  const salesH = teamH + colH + salesTeam.length * rowH
  const entH = enterpriseTeam.length > 0 ? teamH + colH + enterpriseTeam.length * rowH + 10 : 0
  const totalHeight = 80 + salesH + entH + 60 + 32

  const width = 700

  const element = {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column' as const, background: '#1a1d21', padding: '14px 16px', width, fontFamily: 'Inter, sans-serif' },
      children: [
        // Header
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #2a2d35' },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' as const },
                  children: [
                    { type: 'div', props: { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' }, children: 'Daily Call Leaderboard' } },
                    { type: 'div', props: { style: { fontSize: 10, color: '#64748b', marginTop: 2 }, children: dateDisplay } },
                  ]
                }
              },
              { type: 'div', props: { style: { background: '#2563EB', color: 'white', padding: '3px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600 }, children: reportType + ' Update' } },
            ]
          }
        },
        TeamSection('Sales Team', salesTeam),
        ...(enterpriseTeam.length > 0 ? [TeamSection('Enterprise Team', enterpriseTeam)] : []),
        // Summary bar
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'row' as const, background: '#252930', border: '1px solid #2a2d35', borderRadius: 5, padding: '8px 12px', marginTop: 8, justifyContent: 'space-between' as const, alignItems: 'center' as const },
            children: [
              ...[
                { label: 'TOTAL CALLS', value: String(teamTotal.total_calls || 0) },
                { label: 'CONNECTED', value: String(teamTotal.connected || 0) },
                { label: 'DURATION', value: (teamTotal.duration_min || 0) + ' min' },
                { label: 'AVG CONNECT', value: (teamTotal.avg_connect_percent || 0) + '%' },
                { label: 'MISSED', value: String(teamTotal.missed || 0) },
              ].map(item => ({
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const },
                  children: [
                    { type: 'div', props: { style: { fontSize: 8, color: '#64748b', letterSpacing: '0.05em' }, children: item.label } },
                    { type: 'div', props: { style: { fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginTop: 1 }, children: item.value } },
                  ]
                }
              })),
              { type: 'div', props: { style: { fontSize: 8, color: '#374151' }, children: 'flabs' } },
            ]
          }
        },
      ]
    }
  }

  const fontData = getFont()
  const fonts = fontData
    ? [{ name: 'Inter', data: fontData, weight: 400 as const, style: 'normal' as const }]
    : []

  const svg = await satori(element as any, { width, height: totalHeight, fonts })

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: '#1a1d21',
  })

  const pngData = resvg.render()
  return Buffer.from(pngData.asPng())
}
