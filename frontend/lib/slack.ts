export async function postToSlack({
  reportType,
  reportDate,
  salesTeam,
  teamTotal,
  imageBuffer,
}: {
  reportType: string
  reportDate: string
  salesTeam: any[]
  teamTotal: any
  imageBuffer: Buffer
}) {
  const token = process.env.SLACK_BOT_TOKEN
  const channelId = process.env.SLACK_CHANNEL_ID || 'C0B79PG8UE8'

  if (!token) {
    console.error('SLACK_BOT_TOKEN not set')
    return false
  }

  try {
    const top3 = salesTeam.slice(0, 3)
    const medals = ['🥇', '🥈', '🥉']
    const topText = top3.map((m, i) => `${medals[i]} ${m.name} (${m.all_calls} calls)`).join('  ')

    const date = new Date(reportDate).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const text = `📊 *Daily Call Leaderboard — ${reportType} Update*\n${date}\n\n${topText}\n\nTotal: ${teamTotal.total_calls} calls | ${teamTotal.duration_min} min | ${teamTotal.avg_connect_percent}% avg connect`

    const formData = new FormData()
    formData.append('channels', channelId)
    formData.append('initial_comment', text)
    formData.append('filename', `leaderboard_${reportDate}_${reportType}.png`)
    formData.append('title', `Call Leaderboard ${reportType} — ${reportDate}`)

    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' })
    formData.append('file', blob, `leaderboard_${reportDate}_${reportType}.png`)

    const res = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const data = await res.json()
    if (!data.ok) {
      console.error('Slack upload failed:', data.error)
      return false
    }

    return true
  } catch (e) {
    console.error('Slack error:', e)
    return false
  }
}

export async function postToSlackBlocks(
  blocks: any,
  reportType: string,
  reportDate: string
) {
  const token = process.env.SLACK_BOT_TOKEN
  const channelId = process.env.SLACK_CHANNEL_ID || 'C0B79PG8UE8'

  if (!token) {
    console.error('SLACK_BOT_TOKEN not set')
    return false
  }

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: blocks.text,
        blocks: blocks.blocks,
      }),
    })

    const data = await res.json()
    if (!data.ok) {
      console.error('Slack post failed:', data.error)
      return false
    }
    return true
  } catch (e) {
    console.error('Slack error:', e)
    return false
  }
}
