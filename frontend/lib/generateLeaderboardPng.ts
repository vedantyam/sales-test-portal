export async function generateLeaderboardPng(html: string): Promise<Buffer | null> {
  try {
    return null
  } catch (e) {
    console.error('PNG generation failed:', e)
    return null
  }
}

export function generateSlackBlocks(
  salesTeam: any[],
  enterpriseTeam: any[],
  teamTotal: any,
  reportType: string,
  reportDate: string
) {
  const date = new Date(reportDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const medals = ['🥇', '🥈', '🥉']

  const salesRows = salesTeam.slice(0, 10).map((m, i) => {
    const medal = i < 3 ? medals[i] : `${i + 1}.`
    return `${medal} *${m.name}* — ${m.all_calls} calls | ${m.connected} connected | ${m.connect_percent}% | ${m.status}`
  }).join('\n')

  const enterpriseRows = enterpriseTeam.map((m, i) => {
    return `${medals[i] || `${i + 1}.`} *${m.name}* — ${m.all_calls} calls | ${m.connected} connected | ${m.connect_percent}%`
  }).join('\n')

  return {
    text: `📊 Daily Call Leaderboard — ${reportType} Update\n${date}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📊 Daily Call Leaderboard — ${reportType} Update` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${date}*` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*🏢 Sales Team*\n${salesRows}` }
      },
      ...(enterpriseTeam.length > 0 ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*🎯 Enterprise Team*\n${enterpriseRows}` }
      }] : []),
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Team Summary*\nTotal Calls: ${teamTotal.total_calls} | Connected: ${teamTotal.connected} | Duration: ${teamTotal.duration_min} min | Avg Connect: ${teamTotal.avg_connect_percent}%`
        }
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: '⚡ flabs · diagnoshuttle private limited' }]
      }
    ]
  }
}
