import { CallMember } from '@/lib/processCallData'

interface Props {
  salesTeam: CallMember[]
  enterpriseTeam: CallMember[]
  teamTotal: any
  reportType: string
  reportDate: string
  forPng?: boolean
}

function getRankDisplay(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Excellent: { bg: '#1e3a5f', color: '#60a5fa' },
    Good: { bg: '#14532d', color: '#4ade80' },
    Low: { bg: '#7f1d1d', color: '#f87171' },
  }
  const c = colors[status] || colors.Good
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.03em',
    }}>
      {status}
    </span>
  )
}

function MemberRow({ member, isLowPerformer }: { member: CallMember; isLowPerformer: boolean }) {
  return (
    <tr style={{
      background: isLowPerformer ? 'rgba(127,29,29,0.15)' : 'transparent',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 16 }}>
        {getRankDisplay(member.rank)}
      </td>
      <td style={{ padding: '10px 12px', fontWeight: 500, color: '#f1f5f9', fontSize: 13 }}>
        {member.name}
        {isLowPerformer && (
          <span style={{ fontSize: 10, color: '#f87171', marginLeft: 6 }}>⚠</span>
        )}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        {member.all_calls}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#4ade80', fontSize: 13, fontWeight: 500 }}>
        {member.connected}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        {member.duration_min}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600,
        color: member.connect_percent >= 50 ? '#60a5fa' : member.connect_percent >= 25 ? '#4ade80' : '#f87171'
      }}>
        {member.connect_percent}%
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center', color: member.missed > 0 ? '#f87171' : '#94a3b8', fontSize: 13 }}>
        {member.missed}
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
        <StatusBadge status={member.status} />
      </td>
    </tr>
  )
}

function TeamTable({ title, members, lowPerformerNames }: { title: string; members: CallMember[]; lowPerformerNames: string[] }) {
  const headerStyle = {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        background: '#2563EB',
        padding: '10px 16px',
        borderRadius: '8px 8px 0 0',
        fontSize: 13,
        fontWeight: 600,
        color: 'white',
        letterSpacing: '0.05em',
      }}>
        {title}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e2128' }}>
        <thead>
          <tr style={{ background: '#252930' }}>
            <th style={{ ...headerStyle, width: 50, textAlign: 'center' }}>Rank</th>
            <th style={{ ...headerStyle, minWidth: 140 }}>Name</th>
            <th style={{ ...headerStyle, textAlign: 'center', width: 80 }}>All Calls</th>
            <th style={{ ...headerStyle, textAlign: 'center', width: 90 }}>Connected</th>
            <th style={{ ...headerStyle, textAlign: 'center', width: 100 }}>Duration (min)</th>
            <th style={{ ...headerStyle, textAlign: 'center', width: 90 }}>Connect%</th>
            <th style={{ ...headerStyle, textAlign: 'center', width: 70 }}>Missed</th>
            <th style={{ ...headerStyle, textAlign: 'center', width: 90 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <MemberRow
              key={member.name}
              member={member}
              isLowPerformer={lowPerformerNames.includes(member.name)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CallLeaderboard({ salesTeam, enterpriseTeam, teamTotal, reportType, reportDate, forPng }: Props) {
  const lowPerformerNames = salesTeam.filter(m => m.is_low_performer).map(m => m.name)

  const dateStr = reportDate.includes('T') ? reportDate.split('T')[0] : reportDate
  const date = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div
      id="call-leaderboard"
      style={{
        background: '#1a1d21',
        padding: 20,
        borderRadius: forPng ? 0 : 12,
        border: '1px solid rgba(255,255,255,0.08)',
        width: forPng ? 900 : '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
            📊 Daily Call Leaderboard
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{date}</div>
        </div>
        <div style={{
          background: '#2563EB',
          color: 'white',
          padding: '4px 14px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
        }}>
          {reportType} Update
        </div>
      </div>

      <TeamTable
        title="🏢 Sales Team"
        members={salesTeam}
        lowPerformerNames={lowPerformerNames}
      />

      {enterpriseTeam.length > 0 && (
        <TeamTable
          title="🎯 Enterprise Team"
          members={enterpriseTeam}
          lowPerformerNames={[]}
        />
      )}

      <div style={{
        background: '#252930',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        gap: 32,
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Total Calls', value: teamTotal.total_calls },
          { label: 'Connected', value: teamTotal.connected },
          { label: 'Duration', value: `${teamTotal.duration_min} min` },
          { label: 'Avg Connect', value: `${teamTotal.avg_connect_percent}%` },
          { label: 'Missed', value: teamTotal.missed },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {item.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>
              {item.value}
            </div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#374151' }}>⚡ flabs · diagnoshuttle</span>
        </div>
      </div>
    </div>
  )
}
