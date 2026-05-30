'use client'
import { useState, useEffect } from 'react'
import { useAuthStore, hydrate } from '@/store/authStore'
import dynamic from 'next/dynamic'

const CallLeaderboard = dynamic(() => import('@/components/CallLeaderboard'), { ssr: false })

export default function CallReportPage() {
  const { accessToken } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedType, setSelectedType] = useState<'1PM' | '6PM'>('6PM')
  const [currentReport, setCurrentReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [triggeringCron, setTriggeringCron] = useState(false)
  const [testingSample, setTestingSample] = useState(false)

  useEffect(() => {
    const stored = hydrate()
    if (stored) useAuthStore.getState().setAuth('', stored)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    fetchReport()
  }, [selectedDate, selectedType, accessToken])

  async function fetchReport() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/call-reports?date=${selectedDate}&type=${selectedType}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await res.json()
      setCurrentReport(data.report || null)
    } catch {
      setCurrentReport(null)
    } finally {
      setLoading(false)
    }
  }

  async function sendToSlack() {
    if (!currentReport) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/call-reports/send-slack', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report_id: currentReport.id }),
      })
      const data = await res.json()
      if (data.success) alert('Sent to Slack successfully!')
      else alert('Failed to send: ' + data.error)
    } finally {
      setSending(false)
    }
  }

  async function testSampleData() {
    setTestingSample(true)
    try {
      const res = await fetch('/api/admin/call-reports/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report_type: selectedType, report_date: selectedDate }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentReport(data.report)
      } else {
        alert('Error: ' + data.error)
      }
    } finally {
      setTestingSample(false)
    }
  }

  async function triggerNow() {
    setTriggeringCron(true)
    try {
      const res = await fetch('/api/cron/call-report', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev'}` }
      })
      const data = await res.json()
      if (data.success) {
        alert(`Report generated! ${data.sales_team_count} sales, ${data.enterprise_team_count} enterprise`)
        fetchReport()
      } else {
        alert('Error: ' + data.error)
      }
    } finally {
      setTriggeringCron(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Call Report Leaderboard
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Auto-updated at 1PM and 6PM on weekdays
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={testSampleData}
            disabled={testingSample}
            style={{ padding: '7px 16px', border: '1px solid var(--color-border-secondary)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}
          >
            {testingSample ? 'Generating...' : '🧪 Test with Sample Data'}
          </button>
          <button
            onClick={triggerNow}
            disabled={triggeringCron}
            style={{ padding: '7px 16px', border: '1px solid var(--color-border-secondary)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13 }}
          >
            {triggeringCron ? 'Fetching...' : '↻ Fetch Now'}
          </button>
          <button
            onClick={sendToSlack}
            disabled={sending || !currentReport}
            style={{ padding: '7px 16px', background: '#4A154B', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, opacity: (!currentReport || sending) ? 0.5 : 1 }}
          >
            {sending ? 'Sending...' : '💬 Send to Slack'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid var(--color-border-secondary)', borderRadius: 8, fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}
        />
        <div style={{ display: 'flex', border: '1px solid var(--color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
          {(['1PM', '6PM'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '7px 20px',
                background: selectedType === type ? 'var(--color-text-primary)' : 'transparent',
                color: selectedType === type ? 'var(--color-background-primary)' : 'var(--color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: selectedType === type ? 500 : 400,
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-tertiary)' }}>
          Loading...
        </div>
      ) : currentReport ? (
        <CallLeaderboard
          salesTeam={currentReport.sales_team}
          enterpriseTeam={currentReport.enterprise_team}
          teamTotal={currentReport.team_total}
          reportType={currentReport.report_type}
          reportDate={currentReport.report_date}
        />
      ) : (
        <div style={{
          textAlign: 'center', padding: 60,
          border: '1px solid var(--color-border-tertiary)',
          borderRadius: 12, color: 'var(--color-text-tertiary)'
        }}>
          No report for {selectedDate} {selectedType}.<br />
          <span style={{ fontSize: 12 }}>Reports auto-generated at 1PM and 6PM weekdays.</span>
        </div>
      )}
    </div>
  )
}
