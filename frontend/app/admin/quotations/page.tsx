'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import QuotationPreview, { QuotationPreviewProps } from '@/components/employee/QuotationPreview'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fmtInr } from '@/lib/amountInWords'

type AdminTab = 'overview' | 'analytics' | 'settings'

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuotationRow {
  id: string
  quote_number: string
  sequence_number?: string | null
  client_name: string
  plan_name: string
  total_amount: number
  quote_date: string
  expiry_date: string
  status: string
  employee_name: string
  department: string
  employee_id: string
  client_address?: string
  client_phone?: string
  place_of_supply?: string
  plan_rate: number
  patient_registrations?: string
  features: string[]
  igst_amount: number
  sub_total: number
  salesperson_name?: string
  machines_count?: number
  machine_price?: number
  machine_total?: number
  duration_months?: number
  discount_type?: string
  discount_value?: number
  discount_amount?: number
}

interface SalespersonSummary {
  employee_id: string
  employee_name: string
  department: string
  total_quotes: number
  total_agreements: number
  total_revenue: number
}

interface ActivityLog {
  id: string
  employee_name: string
  action: string
  quote_number: string
  details: Record<string, unknown>
  created_at: string
}

const PIE_COLORS = ['#3b5bdb', '#4dabf7', '#74c0fc', '#a5d8ff', '#d0ebff']

// ─── Settings sub-tab ────────────────────────────────────────────────────────

function ImageUploadCard({
  title,
  description,
  fieldKey,
  currentUrl,
  accept,
  previewMaxH,
  onSaved,
}: {
  title: string
  description: string
  fieldKey: 'signature_image_url' | 'logo_image_url'
  currentUrl: string | null
  accept: string
  previewMaxH: number
  onSaved: () => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = accept.split(',').map((t) => t.trim())
    if (!validTypes.includes(file.type)) {
      setToast(`Allowed: ${accept}`)
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast('Max 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    const url = preview ?? currentUrl ?? null
    setSaving(true)
    try {
      await adminApi.put('/admin/company-settings', { [fieldKey]: url })
      setPreview(null)
      onSaved()
      setToast('Saved!')
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('Save failed')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const displayUrl = preview ?? currentUrl

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Current</p>
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={title}
            style={{ maxHeight: previewMaxH, objectFit: 'contain' }}
            className="border border-gray-200 rounded-lg p-2"
          />
        ) : (
          <p className="text-sm text-gray-400 italic">Nothing uploaded yet.</p>
        )}
      </div>

      <div>
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          Upload PNG / JPG / SVG (max 2MB)
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : `Save ${title}`}
        </button>
        {toast && (
          <span className={`text-xs ${toast === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
            {toast}
          </span>
        )}
      </div>
    </div>
  )
}

function SignatoryCard({
  currentName,
  currentDesignation,
  onSaved,
}: {
  currentName: string | null
  currentDesignation: string | null
  onSaved: () => void
}) {
  const [name, setName] = useState(currentName || '')
  const [designation, setDesignation] = useState(currentDesignation || '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    setName(currentName || '')
    setDesignation(currentDesignation || '')
  }, [currentName, currentDesignation])

  async function handleSave() {
    setSaving(true)
    try {
      await adminApi.put('/admin/company-settings', {
        signatory_name: name || null,
        signatory_designation: designation || null,
      })
      onSaved()
      setToast('Saved!')
      setTimeout(() => setToast(''), 3000)
    } catch {
      setToast('Save failed')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Signatory Details</h3>
        <p className="text-xs text-gray-500">Shown below the authorized signature on all quotations.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Signatory Name</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Harsh Kumar"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Designation</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. Sales Director"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Signatory'}
        </button>
        {toast && (
          <span className={`text-xs ${toast === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>
            {toast}
          </span>
        )}
      </div>
    </div>
  )
}

function SettingsTab() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['admin-company-settings'],
    queryFn: async () => {
      const res = await adminApi.get('/admin/company-settings')
      return res.data.settings
    },
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-company-settings'] })
  }

  return (
    <div className="max-w-lg space-y-6">
      <ImageUploadCard
        title="Company Logo"
        description="Shown in the header of all quotations. PNG, JPG, or SVG recommended."
        fieldKey="logo_image_url"
        currentUrl={data?.logo_image_url ?? null}
        accept="image/png,image/jpeg,image/svg+xml"
        previewMaxH={48}
        onSaved={invalidate}
      />
      <SignatoryCard
        currentName={data?.signatory_name ?? null}
        currentDesignation={data?.signatory_designation ?? null}
        onSaved={invalidate}
      />
      <ImageUploadCard
        title="Authorized Signature"
        description="Appears at the bottom of all employee quotations."
        fieldKey="signature_image_url"
        currentUrl={data?.signature_image_url ?? null}
        accept="image/png,image/jpeg"
        previewMaxH={64}
        onSaved={invalidate}
      />
    </div>
  )
}

// ─── Analytics sub-tab ───────────────────────────────────────────────────────

function AnalyticsTab() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [gstFrom, setGstFrom] = useState('')
  const [gstTo, setGstTo] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  const { data: summary } = useQuery({
    queryKey: ['admin-quotations-summary'],
    queryFn: async () => (await adminApi.get('/admin/quotations/analytics/summary')).data,
  })

  const { data: revData } = useQuery({
    queryKey: ['admin-quotations-revenue', period],
    queryFn: async () => (await adminApi.get(`/admin/quotations/analytics/revenue-over-time?period=${period}`)).data,
  })

  const { data: salesData } = useQuery({
    queryKey: ['admin-quotations-by-salesperson'],
    queryFn: async () => (await adminApi.get('/admin/quotations/analytics/by-salesperson')).data,
  })

  const { data: planData } = useQuery({
    queryKey: ['admin-quotations-plan-distribution'],
    queryFn: async () => (await adminApi.get('/admin/quotations/analytics/plan-distribution')).data,
  })

  const { data: customersData } = useQuery({
    queryKey: ['admin-quotations-customers', customerSearch],
    queryFn: async () => (await adminApi.get(`/admin/quotations/customers?search=${encodeURIComponent(customerSearch)}`)).data,
  })

  const { data: gstData } = useQuery({
    queryKey: ['admin-quotations-gst', gstFrom, gstTo],
    queryFn: async () => (await adminApi.get(`/admin/quotations/analytics/gst?from=${gstFrom}&to=${gstTo}`)).data,
  })

  const revRows = (revData?.data || []).slice().reverse().map((r: { period: string; revenue: number }) => ({
    ...r,
    period: r.period ? new Date(r.period).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '—',
    revenue: Number(r.revenue),
  }))

  const salesRows = salesData?.data || []
  const planRows = (planData?.data || []).map((r: { plan_name: string; count: number }, i: number) => ({
    name: r.plan_name,
    value: r.count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))

  function exportTableCSV(rows: Record<string, unknown>[], filename: string) {
    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => `"${r[k] ?? ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const kpiCards = [
    { label: 'Total Revenue', value: `₹${fmtInr(Number(summary?.total_revenue || 0))}` },
    { label: 'Total Quotations', value: summary?.total_quotations ?? 0 },
    { label: 'Sent', value: summary?.sent ?? 0 },
    { label: 'Draft', value: summary?.draft ?? 0 },
  ]

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue over time */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Revenue Over Time</h3>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-md font-medium capitalize ${period === p ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${fmtInr(v)}`} />
            <Tooltip formatter={(v) => [`₹${fmtInr(Number(v))}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue by salesperson */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Salesperson</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesRows} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${fmtInr(v)}`} />
              <YAxis dataKey="employee_name" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={(v) => [`₹${fmtInr(Number(v))}`, 'Revenue']} />
              <Bar dataKey="total_revenue" fill="#4dabf7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          {planRows.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planRows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {planRows.map((entry: { fill: string }, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No data</p>
          )}
        </div>
      </div>

      {/* Customer database */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Customer Database</h3>
          <div className="flex items-center gap-2">
            <input
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-400"
              placeholder="Search lab name…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <button
              onClick={() => exportTableCSV(customersData?.customers || [], 'customers.csv')}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Lab Name', 'Phone', 'Place of Supply', 'Plan', 'Amount', 'Date', 'Salesperson'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(customersData?.customers || []).map((c: QuotationRow) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.client_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.client_phone || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.place_of_supply || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.plan_name}</td>
                  <td className="px-4 py-2.5 text-gray-900">₹{fmtInr(Number(c.total_amount))}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.quote_date?.split('T')[0] || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.salesperson_name || '—'}</td>
                </tr>
              ))}
              {!(customersData?.customers?.length) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST Report */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900">GST Report</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={gstFrom} onChange={(e) => setGstFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={gstTo} onChange={(e) => setGstTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
            <button
              onClick={() => exportTableCSV(gstData?.data || [], 'gst-report.csv')}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Quote Date', 'Client', 'Plan', 'Sub Total', 'IGST (18%)', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(gstData?.data || []).map((r: { quote_number: string; quote_date: string; client_name: string; plan_name: string; sub_total: number; igst_amount: number; total_amount: number }) => (
                <tr key={r.quote_number} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600">{r.quote_date?.split('T')[0] || '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{r.client_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.plan_name}</td>
                  <td className="px-4 py-2.5 text-gray-900">₹{fmtInr(Number(r.sub_total))}</td>
                  <td className="px-4 py-2.5 text-gray-900">₹{fmtInr(Number(r.igst_amount))}</td>
                  <td className="px-4 py-2.5 text-gray-900 font-medium">₹{fmtInr(Number(r.total_amount))}</td>
                </tr>
              ))}
              {!gstData?.data?.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Top Salespeople</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {['Rank', 'Name', 'Quotes', 'Revenue'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {salesRows.map((r: SalespersonSummary, i: number) => (
              <tr key={r.employee_id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{r.employee_name}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.total_quotes}</td>
                <td className="px-4 py-2.5 text-gray-900 font-medium">₹{fmtInr(Number(r.total_revenue))}</td>
              </tr>
            ))}
            {!salesRows.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Overview sub-tab ────────────────────────────────────────────────────────

function OverviewTab() {
  const [selectedEmployee, setSelectedEmployee] = useState<SalespersonSummary | null>(null)
  const [previewQuotation, setPreviewQuotation] = useState<QuotationRow | null>(null)
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [quotationSearch, setQuotationSearch] = useState('')

  const { data: salesData } = useQuery({
    queryKey: ['admin-quotations-by-salesperson'],
    queryFn: async () => (await adminApi.get('/admin/quotations/analytics/by-salesperson')).data,
  })

  const { data: employeeQuotations } = useQuery({
    queryKey: ['admin-employee-quotations', selectedEmployee?.employee_id],
    queryFn: async () =>
      (await adminApi.get(`/admin/quotations/by-employee/${selectedEmployee!.employee_id}`)).data,
    enabled: !!selectedEmployee,
  })

  const { data: activityData } = useQuery({
    queryKey: ['admin-activity-logs'],
    queryFn: async () => (await adminApi.get('/admin/quotations/activity-logs')).data,
    enabled: activityOpen,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['admin-company-settings'],
    queryFn: async () => (await adminApi.get('/admin/company-settings')).data,
  })

  const sig = settingsData?.settings?.signature_image_url || signatureImageUrl
  const signatoryName = settingsData?.settings?.signatory_name || null
  const signatoryDesignation = settingsData?.settings?.signatory_designation || null

  function openQuotationPreview(q: QuotationRow) {
    setPreviewQuotation(q)
    setSignatureImageUrl(settingsData?.settings?.signature_image_url || null)
  }

  if (previewQuotation) {
    const q = previewQuotation
    const previewProps: QuotationPreviewProps = {
      quoteNumber: q.quote_number,
      sequenceNumber: q.sequence_number,
      clientName: q.client_name,
      clientAddress: q.client_address,
      clientPhone: q.client_phone,
      placeOfSupply: q.place_of_supply,
      planName: q.plan_name,
      rate: Number(q.plan_rate),
      patientRegistrations: q.patient_registrations,
      features: Array.isArray(q.features) ? q.features : [],
      machinesCount: Number(q.machines_count) || 0,
      machinePrice: Number(q.machine_price) || 0,
      machineTotal: Number(q.machine_total) || 0,
      durationMonths: Number(q.duration_months) || 12,
      discountType: q.discount_type || 'none',
      discountValue: Number(q.discount_value) || 0,
      discountAmount: Number(q.discount_amount) || 0,
      quoteDate: q.quote_date?.split('T')[0],
      expiryDate: q.expiry_date?.split('T')[0],
      signatureImageUrl: sig,
      logoImageUrl: settingsData?.settings?.logo_image_url || null,
      signatoryName,
      signatoryDesignation,
    }
    return (
      <div>
        <button
          onClick={() => setPreviewQuotation(null)}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-3xl">
          <QuotationPreview {...previewProps} />
        </div>
      </div>
    )
  }

  if (selectedEmployee) {
    const quotations: QuotationRow[] = employeeQuotations?.quotations || []
    const filtered = quotationSearch
      ? quotations.filter((q) =>
          q.client_name.toLowerCase().includes(quotationSearch.toLowerCase()) ||
          (q.sequence_number || '').includes(quotationSearch) ||
          q.plan_name.toLowerCase().includes(quotationSearch.toLowerCase())
        )
      : quotations
    return (
      <div>
        <button
          onClick={() => { setSelectedEmployee(null); setQuotationSearch('') }}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← All Salespeople
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{selectedEmployee.employee_name}</h2>
            <p className="text-xs text-gray-500">{selectedEmployee.department}</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <input
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-blue-400"
              placeholder="Search by client, #, plan…"
              value={quotationSearch}
              onChange={(e) => setQuotationSearch(e.target.value)}
            />
            <span className="text-sm text-gray-600">{selectedEmployee.total_quotes} quote{selectedEmployee.total_quotes !== 1 ? 's' : ''}</span>
            <span className="font-medium text-gray-900 text-sm">₹{fmtInr(Number(selectedEmployee.total_revenue))}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['#', 'Client Name', 'Plan', 'Amount', 'Quote Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((q) => (
                <tr key={q.id} onClick={() => openQuotationPreview(q)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-2.5 text-xs font-mono text-blue-700">
                    {q.sequence_number ? `#${q.sequence_number}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{q.client_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{q.plan_name}</td>
                  <td className="px-4 py-2.5 text-gray-900">₹{fmtInr(Number(q.total_amount))}</td>
                  <td className="px-4 py-2.5 text-gray-600">{q.quote_date?.split('T')[0] || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${q.status === 'sent' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                      {q.status === 'sent' ? 'Sent' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {quotationSearch ? 'No matches' : 'No quotations'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const salesRows: SalespersonSummary[] = salesData?.data || []
  const filteredSalesRows = employeeSearch
    ? salesRows.filter((r) => r.employee_name.toLowerCase().includes(employeeSearch.toLowerCase()))
    : salesRows

  return (
    <div className="space-y-6">
      {/* Salespeople table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Salespeople</h3>
            <p className="text-xs text-gray-500 mt-0.5">Click a row to view their quotations</p>
          </div>
          <input
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-400"
            placeholder="Search by name…"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Name', 'Department', 'Quotes', 'Agreements', 'Total Revenue'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSalesRows.map((r) => (
              <tr key={r.employee_id} onClick={() => setSelectedEmployee(r)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2.5 font-medium text-gray-900">{r.employee_name}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.department}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.total_quotes}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.total_agreements ?? 0}</td>
                <td className="px-4 py-2.5 text-gray-900 font-medium">₹{fmtInr(Number(r.total_revenue))}</td>
              </tr>
            ))}
            {!filteredSalesRows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No quotations yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Activity log collapsible */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setActivityOpen((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <span>Activity Log</span>
          <span className="text-gray-400 text-xs">{activityOpen ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {activityOpen && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Employee', 'Action', 'Quote #', 'Details', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(activityData?.logs || []).map((log: ActivityLog) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{log.employee_name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 capitalize">{log.action}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{log.quote_number || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{log.details ? JSON.stringify(log.details) : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {!activityData?.logs?.length && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">No activity</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminQuotationsPage() {
  const [tab, setTab] = useState<AdminTab>('overview')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Quotations</h1>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['overview', 'analytics', 'settings'] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}
