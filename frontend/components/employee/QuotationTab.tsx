'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import QuotationPreview from './QuotationPreview'
import { fmtInr } from '@/lib/amountInWords'

type PlanName = 'Starter' | 'Growth' | 'Leader' | 'Enterprise'

interface PlanDefaults {
  rate: number
  registrations: string
  features: string[]
}

const PLAN_DEFAULTS: Record<PlanName, PlanDefaults> = {
  Starter: {
    rate: 6000,
    registrations: '15,000 Annual Bills',
    features: [
      'Custom Billing', 'Custom Reporting', 'Financial Analysis', 'Business Analysis',
      'User Management', 'Package Module', 'Referral Doctor Login', 'Dr. Referral Management',
      'QR-Verified Reports', 'Phone Access', 'Ticket Support',
    ],
  },
  Growth: {
    rate: 9000,
    registrations: '15,000 Annual Bills',
    features: [
      'All Starter Features', 'Outsource Management', 'QR Code on Bill', 'Login Tracker',
      'Free Letterhead Design', 'Quotation Module', 'Activity Tracking', 'Lab Mobile App',
      'Department Wise Signature',
    ],
  },
  Leader: {
    rate: 12000,
    registrations: '20,000 Annual Bills',
    features: [
      'All Growth Plan Features', 'Inventory Management', 'Phlebo Module', 'HbA1c Graph',
      'TAT Tracking', 'Accession Module', 'Test Wise Reporting', 'Promotion Templates',
      'Advanced Analytics', 'Bulk Actions (Reg, Download, Share)', '1 Free Machine Interfacing',
    ],
  },
  Enterprise: {
    rate: 0,
    registrations: '20,000+ Annual Bills',
    features: [
      'All Leader Plan Features', 'WhatsApp Integration', 'Chain of Labs Management',
      'B2B Module', 'Corporate Module', 'Multiple Machines Interfacing',
      'Marketing Team Management', 'Dedicated Account Manager', 'Priority Support', 'And Many More',
    ],
  },
}

interface QuotationRow {
  id: string
  quote_number: string
  client_name: string
  plan_name: string
  total_amount: number
  quote_date: string
  status: string
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function QuotationTab() {
  const queryClient = useQueryClient()

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [salespersonEmail, setSalespersonEmail] = useState('')
  const [saveDetails, setSaveDetails] = useState(false)
  const [planName, setPlanName] = useState<PlanName | ''>('')
  const [rate, setRate] = useState(0)
  const [patientRegistrations, setPatientRegistrations] = useState('')
  const [features, setFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState('')
  const [quoteDate, setQuoteDate] = useState(today())
  const [expiryDate, setExpiryDate] = useState(today())
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null)
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Company signature
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null)

  // Fetch salesperson profile
  useEffect(() => {
    api.get('/employee/profile').then((r) => {
      if (r.data.profile) {
        setDisplayName(r.data.profile.display_name || '')
        setSalespersonEmail(r.data.profile.email || '')
      }
    }).catch(() => {})
  }, [])

  // Fetch company settings (signature)
  useEffect(() => {
    api.get('/employee/company-settings').then((r) => {
      setSignatureImageUrl(r.data.signature_image_url || null)
    }).catch(() => {})
  }, [])

  // Quotation history
  const { data: historyData, refetch: refetchHistory } = useQuery<{ quotations: QuotationRow[] }>({
    queryKey: ['employee-quotations'],
    queryFn: async () => {
      const res = await api.get('/employee/quotations')
      return res.data
    },
  })

  function handlePlanChange(name: PlanName | '') {
    setPlanName(name)
    if (name && PLAN_DEFAULTS[name]) {
      const d = PLAN_DEFAULTS[name]
      setRate(d.rate)
      setPatientRegistrations(d.registrations)
      setFeatures([...d.features])
    } else {
      setRate(0)
      setPatientRegistrations('')
      setFeatures([])
    }
  }

  function removeFeature(idx: number) {
    setFeatures((f) => f.filter((_, i) => i !== idx))
  }

  function addFeature() {
    const t = newFeature.trim()
    if (t) {
      setFeatures((f) => [...f, t])
      setNewFeature('')
    }
  }

  async function handleSaveDraft() {
    if (!clientName.trim() || !planName) {
      setSaveMsg('Fill Lab Name and select a Plan first.')
      setTimeout(() => setSaveMsg(''), 3000)
      return
    }
    setIsSaving(true)
    try {
      const igst = Math.round(rate * 0.18)
      const total = rate + igst
      const payload = {
        client_name: clientName,
        client_address: clientAddress,
        client_phone: clientPhone,
        place_of_supply: placeOfSupply,
        plan_name: planName,
        plan_rate: rate,
        patient_registrations: patientRegistrations,
        features,
        sub_total: rate,
        igst_amount: igst,
        total_amount: total,
        quote_date: quoteDate,
        expiry_date: expiryDate,
        status: 'draft',
      }
      const res = await api.post('/employee/quotations', payload)
      const qt = res.data.quotation
      setSavedQuoteNumber(qt.quote_number)
      setSavedQuotationId(qt.id)
      setSaveMsg('Saved as draft!')
      setTimeout(() => setSaveMsg(''), 3000)
      refetchHistory()
      queryClient.invalidateQueries({ queryKey: ['employee-quotations'] })

      if (saveDetails && displayName) {
        await api.put('/employee/profile', { display_name: displayName, email: salespersonEmail }).catch(() => {})
      }
    } catch {
      setSaveMsg('Save failed. Try again.')
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  function handleDownloadPDF() {
    if (savedQuotationId) {
      api.patch(`/employee/quotations/${savedQuotationId}`, { action: 'downloaded' }).catch(() => {})
    }
    const original = document.title
    const labName = clientName.replace(/\s+/g, '_') || 'Client'
    const qtNum = savedQuoteNumber || 'DRAFT'
    document.title = `Flabs_Quotation_${labName}_${qtNum}`
    window.print()
    document.title = original
  }

  function handleWhatsApp() {
    const qtNum = savedQuoteNumber || 'Pending'
    const igst = Math.round(rate * 0.18)
    const total = rate + igst
    const msg =
      `Dear ${clientName || 'Team'},\n\n` +
      `Please find the quotation from Flabs (Diagnoshuttle Private Limited) for the ${planName} Subscription Plan.\n\n` +
      `Quote No: ${qtNum}\n` +
      `Amount: ₹${fmtInr(total)} (incl. GST)\n` +
      `Valid Till: ${expiryDate}\n\n` +
      `We look forward to partnering with you. For any queries feel free to reach out.\n\n` +
      `Regards,\n${displayName || 'Team'}\nFlabs Team | accounts@flabs.in`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function loadHistoryRow(q: QuotationRow) {
    api.get(`/employee/quotations/${q.id}`).then((r) => {
      const qt = r.data.quotation
      setClientName(qt.client_name || '')
      setClientAddress(qt.client_address || '')
      setClientPhone(qt.client_phone || '')
      setPlaceOfSupply(qt.place_of_supply || '')
      setPlanName(qt.plan_name || '')
      setRate(Number(qt.plan_rate) || 0)
      setPatientRegistrations(qt.patient_registrations || '')
      setFeatures(Array.isArray(qt.features) ? qt.features : [])
      setQuoteDate(qt.quote_date?.split('T')[0] || today())
      setExpiryDate(qt.expiry_date?.split('T')[0] || today())
      setSavedQuoteNumber(qt.quote_number)
      setSavedQuotationId(qt.id)
      setIsReadOnly(true)
    }).catch(() => {})
  }

  function resetForm() {
    setClientName('')
    setClientAddress('')
    setClientPhone('')
    setPlaceOfSupply('')
    setPlanName('')
    setRate(0)
    setPatientRegistrations('')
    setFeatures([])
    setQuoteDate(today())
    setExpiryDate(today())
    setSavedQuoteNumber(null)
    setSavedQuotationId(null)
    setIsReadOnly(false)
    setSaveMsg('')
  }

  const igst = Math.round(rate * 0.18)
  const total = rate + igst

  const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-default' : 'bg-white'}`
  const sectionLabel = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3'

  return (
    <div>
      {/* Split screen */}
      <div className="flex gap-4 items-start print:block">
        {/* Left: Form (45%) */}
        <div className="w-5/12 print:hidden space-y-5">
          {isReadOnly && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700 flex items-center justify-between">
              <span>Viewing saved quotation (read-only)</span>
              <button onClick={resetForm} className="text-xs font-medium text-amber-800 underline">New Quotation</button>
            </div>
          )}

          {/* Client Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className={sectionLabel}>Client Details</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lab Name *</label>
              <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={isReadOnly} placeholder="Enter lab name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Address</label>
              <textarea className={`${inputCls} resize-none`} rows={2} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} disabled={isReadOnly} placeholder="Address" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
              <input className={inputCls} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} disabled={isReadOnly} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Place of Supply</label>
              <input className={inputCls} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} disabled={isReadOnly} placeholder="State / City" />
            </div>
          </div>

          {/* Your Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className={sectionLabel}>Your Details — Lead Closed By</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Display Name</label>
              <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isReadOnly} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input className={inputCls} type="email" value={salespersonEmail} onChange={(e) => setSalespersonEmail(e.target.value)} disabled={isReadOnly} placeholder="your@email.com" />
            </div>
            {!isReadOnly && (
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={saveDetails} onChange={(e) => setSaveDetails(e.target.checked)} className="rounded" />
                Save my details for next time
              </label>
            )}
          </div>

          {/* Plan */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className={sectionLabel}>Plan</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plan</label>
              <select
                className={inputCls}
                value={planName}
                onChange={(e) => handlePlanChange(e.target.value as PlanName | '')}
                disabled={isReadOnly}
              >
                <option value="">Select a plan</option>
                {(['Starter', 'Growth', 'Leader', 'Enterprise'] as PlanName[]).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rate (₹ / year)</label>
              <input
                className={inputCls}
                type="number"
                value={rate || ''}
                onChange={(e) => setRate(Number(e.target.value))}
                disabled={isReadOnly}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Patient Registrations</label>
              <input className={inputCls} value={patientRegistrations} onChange={(e) => setPatientRegistrations(e.target.value)} disabled={isReadOnly} placeholder="e.g. 15,000 Annual Bills" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Features</label>
              <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                {features.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100">
                    {f}
                    {!isReadOnly && (
                      <button onClick={() => removeFeature(i)} className="text-blue-400 hover:text-blue-700 leading-none">✕</button>
                    )}
                  </span>
                ))}
              </div>
              {!isReadOnly && (
                <div className="flex gap-2 mt-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Add a feature..."
                  />
                  <button onClick={addFeature} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                </div>
              )}
            </div>
          </div>

          {/* Computed preview */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between"><span>Rate</span><span className="font-medium">₹{fmtInr(rate)}</span></div>
            <div className="flex justify-between"><span>IGST (18%)</span><span className="font-medium">₹{fmtInr(igst)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900"><span>Total</span><span>₹{fmtInr(total)}</span></div>
          </div>

          {/* Quote Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className={sectionLabel}>Quote Dates</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quote Date</label>
              <input className={inputCls} type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} disabled={isReadOnly} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
              <input className={inputCls} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={isReadOnly} />
            </div>
          </div>

          {/* Action buttons */}
          {!isReadOnly && (
            <div className="space-y-2">
              {saveMsg && (
                <p className={`text-xs text-center ${saveMsg.includes('fail') || saveMsg.includes('Fill') ? 'text-red-500' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save as Draft'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700"
                >
                  Download PDF
                </button>
              </div>
              <div className="relative group">
                <button
                  onClick={handleWhatsApp}
                  className="w-full bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <span>Send via WhatsApp</span>
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-lg z-10">
                  Download the PDF first, then attach it manually in WhatsApp.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview (55%) */}
        <div className="w-7/12 print:w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <div className="overflow-y-auto max-h-[85vh] print:max-h-none print:overflow-visible">
            <QuotationPreview
              quoteNumber={savedQuoteNumber}
              clientName={clientName}
              clientAddress={clientAddress}
              clientPhone={clientPhone}
              placeOfSupply={placeOfSupply}
              displayName={displayName}
              salespersonEmail={salespersonEmail}
              planName={planName || '—'}
              rate={rate}
              patientRegistrations={patientRegistrations}
              features={features}
              quoteDate={quoteDate}
              expiryDate={expiryDate}
              signatureImageUrl={signatureImageUrl}
            />
          </div>
        </div>
      </div>

      {/* Quotation history */}
      <div className="mt-8 print:hidden">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quotation History</h3>
        {!historyData?.quotations?.length ? (
          <p className="text-sm text-gray-400 py-4 text-center">No quotations saved yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyData.quotations.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => loadHistoryRow(q)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{q.client_name}</td>
                    <td className="px-4 py-3 text-gray-600">{q.plan_name}</td>
                    <td className="px-4 py-3 text-right text-gray-900">₹{fmtInr(Number(q.total_amount))}</td>
                    <td className="px-4 py-3 text-gray-600">{q.quote_date?.split('T')[0] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 'sent'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {q.status === 'sent' ? 'Sent' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
