'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { adminApi } from '@/lib/api'

const CallLeaderboard = dynamic(() => import('@/components/CallLeaderboard'), { ssr: false })

export default function CallReportPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedType, setSelectedType] = useState<'1PM' | '6PM'>('6PM')
  const [currentReport, setCurrentReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [triggeringCron, setTriggeringCron] = useState(false)
  const [testingSample, setTestingSample] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [selectedDate, selectedType])

  async function fetchReport() {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/call-reports', {
        params: { date: selectedDate, type: selectedType },
      })
      setCurrentReport(res.data.report || null)
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
      const res = await adminApi.post('/admin/call-reports/send-slack', {
        report_id: currentReport.id,
      })
      if (res.data.success) alert('Sent to Slack successfully!')
      else alert('Failed to send: ' + res.data.error)
    } catch (e: any) {
      alert('Failed: ' + (e?.response?.data?.error || e.message))
    } finally {
      setSending(false)
    }
  }

  async function testSampleData() {
    setTestingSample(true)
    try {
      const res = await adminApi.post('/admin/call-reports/test', {
        report_type: selectedType,
        report_date: selectedDate,
      })
      if (res.data.success) {
        setCurrentReport(res.data.report)
      } else {
        alert('Error: ' + res.data.error)
      }
    } catch (e: any) {
      alert('Error: ' + (e?.response?.data?.error || e.message))
    } finally {
      setTestingSample(false)
    }
  }

  async function triggerNow() {
    setTriggeringCron(true)
    try {
      const res = await adminApi.post('/admin/call-reports/test', {
        report_type: selectedType,
        report_date: selectedDate,
      })
      if (res.data.success) {
        alert(`Report generated! ${res.data.report.sales_team?.length ?? 0} sales, ${res.data.report.enterprise_team?.length ?? 0} enterprise`)
        setCurrentReport(res.data.report)
      } else {
        alert('Error: ' + res.data.error)
      }
    } catch (e: any) {
      alert('Error: ' + (e?.response?.data?.error || e.message))
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
