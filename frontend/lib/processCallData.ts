import { ENTERPRISE_TEAM, EXCLUDED_MEMBERS, LOW_PERFORMER_WATCHLIST, getStatus, nameMatches } from './callReportConfig'

export interface CallMember {
  rank: number
  name: string
  all_calls: number
  connected: number
  duration_min: number
  connect_percent: number
  missed: number
  status: string
  is_low_performer: boolean
}

export interface ProcessedCallReport {
  sales_team: CallMember[]
  enterprise_team: CallMember[]
  low_performers: CallMember[]
  team_total: {
    total_calls: number
    connected: number
    duration_min: number
    avg_connect_percent: number
    missed: number
  }
}

export function processCallData(rawData: any): ProcessedCallReport {
  const memberAnalysis = rawData.member_analysis || []

  const allMembers = memberAnalysis
    .filter((m: any) => !nameMatches(m.name || m.member_name || '', EXCLUDED_MEMBERS))
    .map((m: any) => {
      const name = m.name || m.member_name || m.username || 'Unknown'
      const allCalls = Number(m.total_calls || m.all_calls || 0)
      const connected = Number(m.answered || m.connected || 0)
      const durationSec = Number(m.ttt || m.total_talk_time || m.duration || 0)
      const durationMin = Math.round(durationSec / 60)
      const missed = Number(m.noanswer || m.missed || 0)
      const connectPercent = allCalls > 0 ? Math.round((connected / allCalls) * 100 * 10) / 10 : 0

      return {
        name,
        all_calls: allCalls,
        connected,
        duration_min: durationMin,
        connect_percent: connectPercent,
        missed,
        status: getStatus(connectPercent, connected),
        is_low_performer: nameMatches(name, LOW_PERFORMER_WATCHLIST),
      }
    })

  const salesTeamRaw = allMembers
    .filter((m: any) => !nameMatches(m.name, ENTERPRISE_TEAM))
    .sort((a: any, b: any) => b.all_calls - a.all_calls)
    .map((m: any, i: number) => ({ ...m, rank: i + 1 }))

  const enterpriseTeamRaw = allMembers
    .filter((m: any) => nameMatches(m.name, ENTERPRISE_TEAM))
    .sort((a: any, b: any) => b.all_calls - a.all_calls)
    .map((m: any, i: number) => ({ ...m, rank: i + 1 }))

  const lowPerformers = salesTeamRaw.filter((m: any) => m.is_low_performer)

  const totalCalls = salesTeamRaw.reduce((sum: number, m: any) => sum + m.all_calls, 0)
  const totalConnected = salesTeamRaw.reduce((sum: number, m: any) => sum + m.connected, 0)
  const totalDuration = salesTeamRaw.reduce((sum: number, m: any) => sum + m.duration_min, 0)
  const totalMissed = salesTeamRaw.reduce((sum: number, m: any) => sum + m.missed, 0)
  const avgConnect = totalCalls > 0 ? Math.round((totalConnected / totalCalls) * 100 * 10) / 10 : 0

  return {
    sales_team: salesTeamRaw,
    enterprise_team: enterpriseTeamRaw,
    low_performers: lowPerformers,
    team_total: {
      total_calls: totalCalls,
      connected: totalConnected,
      duration_min: totalDuration,
      avg_connect_percent: avgConnect,
      missed: totalMissed,
    },
  }
}

export function generateDummyData(reportType: string): ProcessedCallReport {
  const salesNames = [
    'Aditya Kumar', 'Hima', 'Shreya', 'Pramila Kanwar', 'Neha Singh',
    'Shivanand Dubey', 'Pawan Kumar Singh', 'Neha', 'Shivam Rai',
    'Aavya Tyagi', 'AbhiLove Chauhan', 'Akanksha', 'Prachi Singh',
    'Saurabh Prashar', 'Ritik Gupta', 'Ravi Ranjan Singh', 'Nikita Jaiswal',
    'Harsh Pandey', 'Gulshan', 'Kunal'
  ]

  const salesTeam = salesNames.map((name) => {
    const allCalls = Math.floor(Math.random() * 80) + 20
    const connected = Math.floor(allCalls * (Math.random() * 0.5 + 0.1))
    const connectPercent = Math.round((connected / allCalls) * 1000) / 10
    return {
      rank: 0,
      name,
      all_calls: allCalls,
      connected,
      duration_min: Math.floor(connected * (Math.random() * 3 + 1)),
      connect_percent: connectPercent,
      missed: allCalls - connected,
      status: getStatus(connectPercent, connected),
      is_low_performer: nameMatches(name, LOW_PERFORMER_WATCHLIST),
    }
  })
    .sort((a, b) => b.all_calls - a.all_calls)
    .map((m, i) => ({ ...m, rank: i + 1 }))

  const enterpriseNames = ['Shreyansh', 'Rajat', 'Sanjay']
  const enterpriseTeam = enterpriseNames.map((name, i) => {
    const allCalls = Math.floor(Math.random() * 40) + 10
    const connected = Math.floor(allCalls * (Math.random() * 0.5 + 0.2))
    const connectPercent = Math.round((connected / allCalls) * 1000) / 10
    return {
      rank: i + 1,
      name,
      all_calls: allCalls,
      connected,
      duration_min: Math.floor(connected * 2),
      connect_percent: connectPercent,
      missed: allCalls - connected,
      status: getStatus(connectPercent, connected),
      is_low_performer: false,
    }
  }).sort((a, b) => b.all_calls - a.all_calls).map((m, i) => ({ ...m, rank: i + 1 }))

  const totalCalls = salesTeam.reduce((s, m) => s + m.all_calls, 0)
  const totalConnected = salesTeam.reduce((s, m) => s + m.connected, 0)

  return {
    sales_team: salesTeam,
    enterprise_team: enterpriseTeam,
    low_performers: salesTeam.filter(m => m.is_low_performer),
    team_total: {
      total_calls: totalCalls,
      connected: totalConnected,
      duration_min: salesTeam.reduce((s, m) => s + m.duration_min, 0),
      avg_connect_percent: Math.round((totalConnected / totalCalls) * 1000) / 10,
      missed: salesTeam.reduce((s, m) => s + m.missed, 0),
    }
  }
}
