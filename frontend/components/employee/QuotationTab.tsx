'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import QuotationPreview from './QuotationPreview'
import AgreementPreview from './AgreementPreview'
import { fmtInr } from '@/lib/amountInWords'

type PlanName = 'Starter' | 'Growth' | 'Leader' | 'Enterprise'
type DurationOption = '1' | '3' | '6' | '12' | 'custom'
type DiscountType = 'percent' | 'inr'

const MONTHLY_RATES: Record<PlanName, number> = {
  Starter: 500,
  Growth: 750,
  Leader: 1000,
  Enterprise: 0,
}

interface PlanDefaults {
  registrations: string
  features: string[]
}

const PLAN_DEFAULTS: Record<PlanName, PlanDefaults> = {
  Starter: {
    registrations: '15,000 Annual Bills',
    features: [
      'Custom Billing', 'Custom Reporting', 'Financial Analysis', 'Business Analysis',
      'User Management', 'Package Module', 'Referral Doctor Login', 'Dr. Referral Management',
      'QR-Verified Reports', 'Phone Access', 'Ticket Support',
    ],
  },
  Growth: {
    registrations: '15,000 Annual Bills',
    features: [
      'All Starter Features', 'Outsource Management', 'QR Code on Bill', 'Login Tracker',
      'Free Letterhead Design', 'Quotation Module', 'Activity Tracking', 'Lab Mobile App',
      'Department Wise Signature',
    ],
  },
  Leader: {
    registrations: '20,000 Annual Bills',
    features: [
      'All Growth Plan Features', 'Inventory Management', 'Phlebo Module', 'HbA1c Graph',
      'TAT Tracking', 'Accession Module', 'Test Wise Reporting', 'Promotion Templates',
      'Advanced Analytics', 'Bulk Actions (Reg, Download, Share)', '1 Free Machine Interfacing',
    ],
  },
  Enterprise: {
    registrations: '20,000+ Annual Bills',
    features: [
      'All Leader Plan Features', 'WhatsApp Integration', 'Chain of Labs Management',
      'B2B Module', 'Corporate Module', 'Multiple Machines Interfacing',
      'Marketing Team Management', 'Dedicated Account Manager', 'Priority Support', 'And Many More',
    ],
  },
}

const FEATURES_MASTER = [
  'Custom Billing', 'Custom Reporting', 'Financial Analysis', 'Business Analysis',
  'User Management', 'Package Module', 'Referral Doctor Login', 'Dr. Referral Management',
  'QR-Verified Reports', 'Phone Access', 'Ticket Support', 'Outsource Management',
  'QR Code on Bill', 'Login Tracker', 'Free Letterhead Design', 'Quotation Module',
  'Activity Tracking', 'Lab Mobile App', 'Department Wise Signature', 'Inventory Management',
  'Phlebo Module', 'HbA1c Graph', 'TAT Tracking', 'Accession Module', 'Test Wise Reporting',
  'Promotion Templates', 'Advanced Analytics', 'Bulk Actions (Reg Download Share)',
  '1 Free Machine Interfacing', 'WhatsApp Integration', 'Chain of Labs Management',
  'B2B Module', 'Corporate Module', 'Multiple Machines Interfacing',
  'Marketing Team Management', 'Dedicated Account Manager', 'Priority Support',
]

interface QuotationRow {
  id: string
  quote_number: string
  sequence_number?: string | null
  client_name: string
  plan_name: string
  total_amount: number
  quote_date: string
  status: string
  creator_name?: string | null
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function QuotationTab() {
  const queryClient = useQueryClient()

  // Client details
  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('')
  // Creator info — auto-fetched from profile, never editable
  const [displayName, setDisplayName] = useState('')
  const [salespersonEmail, setSalespersonEmail] = useState('')
  // Plan
  const [planName, setPlanName] = useState<PlanName | ''>('')
  const [rate, setRate] = useState(0)
  const [patientRegistrations, setPatientRegistrations] = useState('')
  // Features
  const [features, setFeatures] = useState<string[]>([])
  const [featureSearch, setFeatureSearch] = useState('')
  const [featureDropdownOpen, setFeatureDropdownOpen] = useState(false)
  const featureDropdownRef = useRef<HTMLDivElement>(null)
  // Duration
  const [durationOption, setDurationOption] = useState<DurationOption>('12')
  const [durationCustomMonths, setDurationCustomMonths] = useState(1)
  // Machine interfacing
  const [machinesCount, setMachinesCount] = useState(0)
  const [machinePrice, setMachinePrice] = useState(0)
  // Discount
  const [discountType, setDiscountType] = useState<DiscountType>('percent')
  const [discountValue, setDiscountValue] = useState(0)
  // Dates
  const [quoteDate, setQuoteDate] = useState(today())
  const [expiryDate, setExpiryDate] = useState(today())
  // Save state
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null)
  const [savedSeqNumber, setSavedSeqNumber] = useState<string | null>(null)
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  // Company settings
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null)
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null)
  const [signatoryName, setSignatoryName] = useState<string | null>(null)
  const [signatoryDesignation, setSignatoryDesignation] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  // GST
  const [zeroGst, setZeroGst] = useState(false)
  // Agreement
  const [includeAgreement, setIncludeAgreement] = useState(false)
  const [previewTab, setPreviewTab] = useState<'quotation' | 'agreement'>('quotation')
  const [agClientContactPerson, setAgClientContactPerson] = useState('')
  const [agClientEmail, setAgClientEmail] = useState('')
  const [agClientGstin, setAgClientGstin] = useState('')
  const [agInterfacingDirection, setAgInterfacingDirection] = useState('Unidirectional')
  const [agProcessingLab, setAgProcessingLab] = useState(false)
  const [agProcessingLabCount, setAgProcessingLabCount] = useState(1)
  const [agWhatsappApi, setAgWhatsappApi] = useState(false)
  const [agRazorpay, setAgRazorpay] = useState(false)
  const [agCollectionCenter, setAgCollectionCenter] = useState(false)
  const [agCollectionCenterCount, setAgCollectionCenterCount] = useState(1)
  const [agPaymentTerms, setAgPaymentTerms] = useState('full_upfront')
  const [agPaymentTermsCustom, setAgPaymentTermsCustom] = useState('')
  const [agOnboardingDate, setAgOnboardingDate] = useState('')
  const [agClientSignatoryName, setAgClientSignatoryName] = useState('')
  const [agClientSignatoryDesignation, setAgClientSignatoryDesignation] = useState('')
  const [restoredFromSession, setRestoredFromSession] = useState(false)

  // Auto-fetch creator info from profile (read-only)
  useEffect(() => {
    api.get('/employee/profile').then((r) => {
      if (r.data.profile) {
        setDisplayName(r.data.profile.display_name || '')
        setSalespersonEmail(r.data.profile.email || '')
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/employee/company-settings').then((r) => {
      setSignatureImageUrl(r.data.signature_image_url || null)
      setLogoImageUrl(r.data.logo_image_url || null)
      setSignatoryName(r.data.signatory_name || null)
      setSignatoryDesignation(r.data.signatory_designation || null)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (featureDropdownRef.current && !featureDropdownRef.current.contains(e.target as Node)) {
        setFeatureDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Restore draft from sessionStorage on mount (skip if a saved quotation is loaded)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('quotation_draft_v1')
      if (!raw) return
      const d = JSON.parse(raw)
      if (!d.clientName) return
      setClientName(d.clientName || '')
      setClientAddress(d.clientAddress || '')
      setClientPhone(d.clientPhone || '')
      setPlaceOfSupply(d.placeOfSupply || '')
      setPlanName(d.planName || '')
      setRate(Number(d.rate) || 0)
      setPatientRegistrations(d.patientRegistrations || '')
      setFeatures(Array.isArray(d.features) ? d.features : [])
      setDurationOption(d.durationOption || '12')
      setDurationCustomMonths(Number(d.durationCustomMonths) || 1)
      setMachinesCount(Number(d.machinesCount) || 0)
      setMachinePrice(Number(d.machinePrice) || 0)
      setDiscountType(d.discountType || 'percent')
      setDiscountValue(Number(d.discountValue) || 0)
      setQuoteDate(d.quoteDate || today())
      setExpiryDate(d.expiryDate || today())
      setZeroGst(Boolean(d.zeroGst))
      setIncludeAgreement(Boolean(d.includeAgreement))
      setAgClientContactPerson(d.agClientContactPerson || '')
      setAgClientEmail(d.agClientEmail || '')
      setAgClientGstin(d.agClientGstin || '')
      setAgInterfacingDirection(d.agInterfacingDirection || 'Unidirectional')
      setAgProcessingLab(Boolean(d.agProcessingLab))
      setAgProcessingLabCount(Number(d.agProcessingLabCount) || 1)
      setAgWhatsappApi(Boolean(d.agWhatsappApi))
      setAgRazorpay(Boolean(d.agRazorpay))
      setAgCollectionCenter(Boolean(d.agCollectionCenter))
      setAgCollectionCenterCount(Number(d.agCollectionCenterCount) || 1)
      setAgPaymentTerms(d.agPaymentTerms || 'full_upfront')
      setAgPaymentTermsCustom(d.agPaymentTermsCustom || '')
      setAgOnboardingDate(d.agOnboardingDate || '')
      setAgClientSignatoryName(d.agClientSignatoryName || '')
      setAgClientSignatoryDesignation(d.agClientSignatoryDesignation || '')
      setRestoredFromSession(true)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist draft to sessionStorage on every form change (skip when viewing a saved quotation)
  useEffect(() => {
    if (savedQuotationId) return
    sessionStorage.setItem('quotation_draft_v1', JSON.stringify({
      clientName, clientAddress, clientPhone, placeOfSupply,
      planName, rate, patientRegistrations, features,
      durationOption, durationCustomMonths,
      machinesCount, machinePrice,
      discountType, discountValue,
      quoteDate, expiryDate, zeroGst, includeAgreement,
      agClientContactPerson, agClientEmail, agClientGstin,
      agInterfacingDirection, agProcessingLab, agProcessingLabCount,
      agWhatsappApi, agRazorpay, agCollectionCenter, agCollectionCenterCount,
      agPaymentTerms, agPaymentTermsCustom, agOnboardingDate,
      agClientSignatoryName, agClientSignatoryDesignation,
    }))
  }, [
    clientName, clientAddress, clientPhone, placeOfSupply,
    planName, rate, patientRegistrations, features,
    durationOption, durationCustomMonths, machinesCount, machinePrice,
    discountType, discountValue, quoteDate, expiryDate, zeroGst, includeAgreement,
    agClientContactPerson, agClientEmail, agClientGstin,
    agInterfacingDirection, agProcessingLab, agProcessingLabCount,
    agWhatsappApi, agRazorpay, agCollectionCenter, agCollectionCenterCount,
    agPaymentTerms, agPaymentTermsCustom, agOnboardingDate,
    agClientSignatoryName, agClientSignatoryDesignation, savedQuotationId,
  ])

  const { data: historyData, refetch: refetchHistory } = useQuery<{ quotations: QuotationRow[] }>({
    queryKey: ['employee-quotations'],
    queryFn: async () => {
      const res = await api.get('/employee/quotations')
      return res.data
    },
  })

  const durationMonths = durationOption === 'custom' ? durationCustomMonths : Number(durationOption)

  function handlePlanChange(name: PlanName | '') {
    setPlanName(name)
    if (name && PLAN_DEFAULTS[name]) {
      const d = PLAN_DEFAULTS[name]
      setPatientRegistrations(d.registrations)
      setFeatures([...d.features])
      if (name !== 'Enterprise') {
        setRate(MONTHLY_RATES[name] * durationMonths)
      } else {
        setRate(0)
      }
    } else {
      setRate(0)
      setPatientRegistrations('')
      setFeatures([])
    }
  }

  function handleDurationChange(opt: DurationOption) {
    setDurationOption(opt)
    const months = opt === 'custom' ? durationCustomMonths : Number(opt)
    if (planName && planName !== 'Enterprise') {
      setRate(MONTHLY_RATES[planName as PlanName] * months)
    }
  }

  function handleCustomMonthsChange(m: number) {
    const safe = Math.max(1, m)
    setDurationCustomMonths(safe)
    if (planName && planName !== 'Enterprise') {
      setRate(MONTHLY_RATES[planName as PlanName] * safe)
    }
  }

  function removeFeature(idx: number) {
    setFeatures((f) => f.filter((_, i) => i !== idx))
  }

  function addFeatureFromSearch() {
    const t = featureSearch.trim()
    if (t && !features.includes(t)) {
      setFeatures((f) => [...f, t])
      setFeatureSearch('')
      setFeatureDropdownOpen(false)
    }
  }

  // Derived calculations
  const machineTotal = machinesCount * machinePrice
  const subTotal = rate + machineTotal
  const discountAmount = discountValue > 0
    ? (discountType === 'percent' ? Math.round(subTotal * discountValue / 100) : discountValue)
    : 0
  const taxableAmount = subTotal - discountAmount
  const gstRate = zeroGst ? 0 : 18
  const igst = Math.round(taxableAmount * gstRate / 100)
  const total = taxableAmount + igst
  // Discount needed to make final total equal subTotal after GST: D = P×G/(100+G)
  const suggestedDiscount = gstRate > 0 && subTotal > 0
    ? Math.round(subTotal * gstRate / (100 + gstRate))
    : 0

  function buildAgreementData() {
    return {
      client_contact_person: agClientContactPerson,
      client_email: agClientEmail,
      client_gstin: agClientGstin,
      interfacing_direction: agInterfacingDirection,
      processing_lab: agProcessingLab,
      processing_lab_count: agProcessingLabCount,
      whatsapp_api: agWhatsappApi,
      razorpay: agRazorpay,
      collection_center: agCollectionCenter,
      collection_center_count: agCollectionCenterCount,
      payment_terms: agPaymentTerms,
      payment_terms_custom: agPaymentTermsCustom,
      onboarding_date: agOnboardingDate,
      client_signatory_name: agClientSignatoryName,
      client_signatory_designation: agClientSignatoryDesignation,
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
      const res = await api.post('/employee/quotations', {
        client_name: clientName, client_address: clientAddress, client_phone: clientPhone,
        place_of_supply: placeOfSupply, plan_name: planName, plan_rate: rate,
        patient_registrations: patientRegistrations, features,
        machines_count: machinesCount, machine_price: machinePrice, machine_total: machineTotal,
        duration_months: durationMonths,
        discount_type: discountValue > 0 ? discountType : 'none',
        discount_value: discountValue,
        discount_amount: discountAmount,
        sub_total: subTotal, igst_amount: igst, total_amount: total,
        quote_date: quoteDate, expiry_date: expiryDate, status: 'draft',
        zero_gst: zeroGst,
        include_agreement: includeAgreement,
        agreement_data: includeAgreement ? buildAgreementData() : {},
      })
      const qt = res.data.quotation
      setSavedQuoteNumber(qt.quote_number)
      setSavedSeqNumber(qt.sequence_number || null)
      setSavedQuotationId(qt.id)
      sessionStorage.removeItem('quotation_draft_v1')
      setRestoredFromSession(false)
      setSaveMsg('Saved as draft!')
      setTimeout(() => setSaveMsg(''), 3000)
      refetchHistory()
      queryClient.invalidateQueries({ queryKey: ['employee-quotations'] })
    } catch {
      setSaveMsg('Save failed. Try again.')
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  function handleDownloadQuotationPDF() {
    if (savedQuotationId) {
      api.patch(`/employee/quotations/${savedQuotationId}`, { action: 'downloaded' }).catch(() => {})
    }
    const original = document.title
    const labName = clientName.replace(/\s+/g, '_') || 'Client'
    const qtNum = savedSeqNumber ? savedSeqNumber : (savedQuoteNumber || 'DRAFT')
    document.title = `Flabs_Quotation_${labName}_${qtNum}`
    document.body.classList.add('printing-quotation')
    window.print()
    document.body.classList.remove('printing-quotation')
    document.title = original
  }

  function handleDownloadAgreementPDF() {
    const original = document.title
    const labName = clientName.replace(/\s+/g, '_') || 'Client'
    const qtNum = savedSeqNumber ? savedSeqNumber : (savedQuoteNumber || 'DRAFT')
    document.title = `Flabs_Agreement_${labName}_${qtNum}`
    document.body.classList.add('printing-agreement')
    window.print()
    document.body.classList.remove('printing-agreement')
    document.title = original
  }

  function buildWhatsAppMsg() {
    const qtNum = savedSeqNumber ? `#${savedSeqNumber}` : (savedQuoteNumber || 'Pending')
    return (
      `Dear ${clientName || 'Team'},\n\n` +
      `Please find the quotation from Flabs (Diagnoshuttle Private Limited) for the ${planName} Subscription Plan.\n\n` +
      `Quote No: ${qtNum}\nAmount: ₹${fmtInr(total)} (${zeroGst ? 'GST: 0%' : 'incl. 18% GST'})\nValid Till: ${expiryDate}\n\n` +
      `We look forward to partnering with you. For any queries feel free to reach out.\n\n` +
      `Regards,\n${displayName || 'Team'}\nFlabs Team | accounts@flabs.in`
    )
  }

  function handleWhatsApp() {
    const digits = clientPhone.replace(/\D/g, '')
    const phone = digits.startsWith('91') ? digits : `91${digits}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMsg())}`, '_blank')
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
      setMachinesCount(Number(qt.machines_count) || 0)
      setMachinePrice(Number(qt.machine_price) || 0)
      const dm = Number(qt.duration_months) || 12
      if ([1, 3, 6, 12].includes(dm)) {
        setDurationOption(dm.toString() as DurationOption)
      } else {
        setDurationOption('custom')
        setDurationCustomMonths(dm)
      }
      const dtype = qt.discount_type === 'inr' ? 'inr' : 'percent'
      setDiscountType(dtype as DiscountType)
      setDiscountValue(Number(qt.discount_value) || 0)
      setQuoteDate(qt.quote_date?.split('T')[0] || today())
      setExpiryDate(qt.expiry_date?.split('T')[0] || today())
      setSavedQuoteNumber(qt.quote_number)
      setSavedSeqNumber(qt.sequence_number || null)
      setSavedQuotationId(qt.id)
      setIsReadOnly(true)
      setHistoryOpen(false)
      setZeroGst(Boolean(qt.zero_gst))
      // Agreement
      setIncludeAgreement(Boolean(qt.include_agreement))
      const ad = qt.agreement_data && typeof qt.agreement_data === 'object' ? qt.agreement_data : {}
      const ads = ad as Record<string, unknown>
      setAgClientContactPerson(String(ads.client_contact_person || ''))
      setAgClientEmail(String(ads.client_email || ''))
      setAgClientGstin(String(ads.client_gstin || ''))
      setAgInterfacingDirection(String(ads.interfacing_direction || 'Unidirectional'))
      setAgProcessingLab(Boolean(ads.processing_lab))
      setAgProcessingLabCount(Number(ads.processing_lab_count) || 1)
      setAgWhatsappApi(Boolean(ads.whatsapp_api))
      setAgRazorpay(Boolean(ads.razorpay))
      setAgCollectionCenter(Boolean(ads.collection_center))
      setAgCollectionCenterCount(Number(ads.collection_center_count) || 1)
      setAgPaymentTerms(String(ads.payment_terms || 'full_upfront'))
      setAgPaymentTermsCustom(String(ads.payment_terms_custom || ''))
      setAgOnboardingDate(String(ads.onboarding_date || ''))
      setAgClientSignatoryName(String(ads.client_signatory_name || ''))
      setAgClientSignatoryDesignation(String(ads.client_signatory_designation || ''))
      setPreviewTab('quotation')
    }).catch(() => {})
  }

  function resetForm() {
    setClientName(''); setClientAddress(''); setClientPhone(''); setPlaceOfSupply('')
    setPlanName(''); setRate(0); setPatientRegistrations(''); setFeatures([])
    setMachinesCount(0); setMachinePrice(0)
    setDurationOption('12'); setDurationCustomMonths(1)
    setDiscountType('percent'); setDiscountValue(0)
    setQuoteDate(today()); setExpiryDate(today())
    setSavedQuoteNumber(null); setSavedSeqNumber(null); setSavedQuotationId(null)
    setIsReadOnly(false); setSaveMsg('')
    sessionStorage.removeItem('quotation_draft_v1')
    setRestoredFromSession(false)
    setZeroGst(false)
    setFeatureSearch(''); setFeatureDropdownOpen(false)
    setIncludeAgreement(false); setPreviewTab('quotation')
    setAgClientContactPerson(''); setAgClientEmail(''); setAgClientGstin('')
    setAgInterfacingDirection('Unidirectional')
    setAgProcessingLab(false); setAgProcessingLabCount(1)
    setAgWhatsappApi(false); setAgRazorpay(false)
    setAgCollectionCenter(false); setAgCollectionCenterCount(1)
    setAgPaymentTerms('full_upfront'); setAgPaymentTermsCustom('')
    setAgOnboardingDate('')
    setAgClientSignatoryName(''); setAgClientSignatoryDesignation('')
  }

  const inputCls = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-default' : 'bg-white'}`
  const sectionLabel = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3'
  const historyCount = historyData?.quotations?.length ?? 0

  const filteredMasterFeatures = FEATURES_MASTER.filter((f) =>
    f.toLowerCase().includes(featureSearch.toLowerCase())
  )

  return (
    <>
      {/* Outer: fixed height so page never scrolls. print: revert to auto. */}
      <div className="flex flex-col print:block print:h-auto" style={{ height: 'calc(100vh - 200px)', minHeight: 560 }}>

        {/* Top bar — sequence number + read-only banner + history button */}
        <div className="flex items-center justify-between mb-2 flex-shrink-0 no-print">
          <div className="flex items-center gap-3">
            {savedSeqNumber && (
              <span className="text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                Quotation #{savedSeqNumber}
              </span>
            )}
            {isReadOnly && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 flex items-center gap-2">
                Viewing saved quotation (read-only)
                <button onClick={resetForm} className="font-medium underline ml-1">New</button>
              </div>
            )}
            {!isReadOnly && restoredFromSession && (
              <div className="text-xs text-gray-500 flex items-center gap-2">
                Unsaved draft restored
                <button
                  onClick={() => { sessionStorage.removeItem('quotation_draft_v1'); resetForm() }}
                  className="underline text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            History
            {historyCount > 0 && (
              <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
                {historyCount}
              </span>
            )}
          </button>
        </div>

        {/* Split screen — fills remaining height */}
        <div className="flex gap-3 flex-1 min-h-0 print:block print:h-auto">

          {/* Left: Form panel */}
          <div className="flex flex-col min-h-0 print:hidden" style={{ width: '44%' }}>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-0.5">

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

              {/* Created By — auto-fetched, read-only */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className={sectionLabel}>Created By</p>
                <p className="text-sm text-gray-700">
                  {displayName || '—'}{salespersonEmail ? ` (${salespersonEmail})` : ''}
                </p>
              </div>

              {/* Plan */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className={sectionLabel}>Plan</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Plan</label>
                  <select className={inputCls} value={planName} onChange={(e) => handlePlanChange(e.target.value as PlanName | '')} disabled={isReadOnly}>
                    <option value="">Select a plan</option>
                    {(['Starter', 'Growth', 'Leader', 'Enterprise'] as PlanName[]).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subscription Duration</label>
                  <select
                    className={inputCls}
                    value={durationOption}
                    onChange={(e) => handleDurationChange(e.target.value as DurationOption)}
                    disabled={isReadOnly}
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">1 Year</option>
                    <option value="custom">Custom</option>
                  </select>
                  {durationOption === 'custom' && (
                    <input
                      type="number"
                      min={1}
                      className={`${inputCls} mt-2`}
                      value={durationCustomMonths}
                      onChange={(e) => handleCustomMonthsChange(Number(e.target.value))}
                      disabled={isReadOnly}
                      placeholder="Enter number of months"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rate (₹)</label>
                  <input className={inputCls} type="number" value={rate || ''} onChange={(e) => setRate(Number(e.target.value))} disabled={isReadOnly} placeholder="0" />
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
                    <div className="relative mt-2" ref={featureDropdownRef}>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                          value={featureSearch}
                          onChange={(e) => { setFeatureSearch(e.target.value); setFeatureDropdownOpen(true) }}
                          onFocus={() => setFeatureDropdownOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const t = featureSearch.trim()
                              if (!t) return
                              const exactMaster = filteredMasterFeatures.find(
                                (f) => f.toLowerCase() === t.toLowerCase() && !features.includes(f)
                              )
                              if (exactMaster) {
                                setFeatures((prev) => [...prev, exactMaster])
                              } else if (!features.includes(t)) {
                                setFeatures((prev) => [...prev, t])
                              }
                              setFeatureSearch('')
                              setFeatureDropdownOpen(false)
                            }
                          }}
                          placeholder="Search or type a feature..."
                        />
                        <button onClick={addFeatureFromSearch} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                      </div>
                      {featureDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {filteredMasterFeatures.length === 0 && featureSearch && (
                            <div className="px-3 py-2 text-xs text-gray-400">
                              Press Enter or Add to add &quot;{featureSearch}&quot; as custom feature
                            </div>
                          )}
                          {filteredMasterFeatures.map((f) => {
                            const alreadyAdded = features.includes(f)
                            return (
                              <button
                                key={f}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  if (!alreadyAdded) {
                                    setFeatures((prev) => [...prev, f])
                                    setFeatureSearch('')
                                    setFeatureDropdownOpen(false)
                                  }
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${alreadyAdded ? 'text-gray-300 cursor-default' : 'text-gray-700 hover:bg-gray-50 cursor-pointer'}`}
                              >
                                {f}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Machine Interfacing */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Machine Interfacing</p>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 normal-case">One-time cost</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Number of Machines</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={machinesCount || ''}
                    onChange={(e) => setMachinesCount(Math.max(0, Number(e.target.value)))}
                    disabled={isReadOnly}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Price Per Machine (₹)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={machinePrice || ''}
                    onChange={(e) => setMachinePrice(Math.max(0, Number(e.target.value)))}
                    disabled={isReadOnly}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Total Interfacing Cost</label>
                  <div className={`${inputCls} bg-gray-50 text-gray-600 cursor-default`}>₹{fmtInr(machineTotal)}</div>
                </div>
              </div>

              {/* Discount */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <p className={sectionLabel}>Discount</p>
                {!isReadOnly && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDiscountType('percent')}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${discountType === 'percent' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => setDiscountType('inr')}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${discountType === 'inr' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      ₹
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Discount Value {discountType === 'percent' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                    disabled={isReadOnly}
                    placeholder="0"
                  />
                </div>
                {!isReadOnly && suggestedDiscount > 0 && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    Suggested discount to absorb GST: ₹{fmtInr(suggestedDiscount)}
                    <button
                      onClick={() => { setDiscountType('inr'); setDiscountValue(suggestedDiscount) }}
                      className="text-blue-600 underline text-xs"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Discount Amount</label>
                    <div className={`${inputCls} bg-gray-50 text-red-600 font-medium cursor-default`}>−₹{fmtInr(discountAmount)}</div>
                  </div>
                )}
              </div>

              {/* Zero GST Toggle */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GST: 0%</p>
                    <p className="text-xs text-gray-400 mt-0.5">Zero GST — exempt or special case</p>
                  </div>
                  <div
                    onClick={() => !isReadOnly && setZeroGst((v) => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${zeroGst ? 'bg-blue-600' : 'bg-gray-300'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${zeroGst ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Include Agreement Toggle */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Include Agreement</p>
                    <p className="text-xs text-gray-400 mt-0.5">Attach a service agreement to this quotation</p>
                  </div>
                  <div
                    onClick={() => !isReadOnly && setIncludeAgreement((v) => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${includeAgreement ? 'bg-blue-600' : 'bg-gray-300'} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeAgreement ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Agreement form sections — only when toggle on */}
              {includeAgreement && (
                <>
                  {/* Client Contact */}
                  <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">Agreement — Client Contact</p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Key Contact Person</label>
                      <input className={inputCls} value={agClientContactPerson} onChange={(e) => setAgClientContactPerson(e.target.value)} disabled={isReadOnly} placeholder="Contact person name" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Client Email</label>
                      <input className={inputCls} type="email" value={agClientEmail} onChange={(e) => setAgClientEmail(e.target.value)} disabled={isReadOnly} placeholder="client@email.com" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Client GSTIN (optional)</label>
                      <input className={inputCls} value={agClientGstin} onChange={(e) => setAgClientGstin(e.target.value)} disabled={isReadOnly} placeholder="22AAAAA0000A1Z5" />
                    </div>
                  </div>

                  {/* Machine Interfacing Direction — only if machines > 0 */}
                  {machinesCount > 0 && (
                    <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
                      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">Agreement — Machine Interfacing Mode</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input type="radio" name="agInterfacingDir" value="Unidirectional" checked={agInterfacingDirection === 'Unidirectional'} onChange={() => setAgInterfacingDirection('Unidirectional')} disabled={isReadOnly} />
                          Unidirectional (machine → host) — ₹15,000/machine
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input type="radio" name="agInterfacingDir" value="Bidirectional" checked={agInterfacingDirection === 'Bidirectional'} onChange={() => setAgInterfacingDirection('Bidirectional')} disabled={isReadOnly} />
                          Bidirectional (both ways) — ₹20,000/machine
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Additional Costs */}
                  <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">Agreement — Additional Costs</p>
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input type="checkbox" checked={agProcessingLab} onChange={(e) => setAgProcessingLab(e.target.checked)} disabled={isReadOnly} className="rounded" />
                          Processing Lab Addition (₹50,000/lab/year)
                        </label>
                        {agProcessingLab && (
                          <div className="mt-2 ml-5">
                            <label className="block text-xs text-gray-500 mb-1">Number of Labs</label>
                            <input className={inputCls} type="number" min={1} value={agProcessingLabCount || ''} onChange={(e) => setAgProcessingLabCount(Math.max(1, Number(e.target.value)))} disabled={isReadOnly} placeholder="1" />
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={agWhatsappApi} onChange={(e) => setAgWhatsappApi(e.target.checked)} disabled={isReadOnly} className="rounded" />
                        WhatsApp API Integration (₹25,000)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={agRazorpay} onChange={(e) => setAgRazorpay(e.target.checked)} disabled={isReadOnly} className="rounded" />
                        Razorpay Integration (₹40,000)
                      </label>
                      <div>
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input type="checkbox" checked={agCollectionCenter} onChange={(e) => setAgCollectionCenter(e.target.checked)} disabled={isReadOnly} className="rounded" />
                          Collection Center Addition (₹8,000/center/year)
                        </label>
                        {agCollectionCenter && (
                          <div className="mt-2 ml-5">
                            <label className="block text-xs text-gray-500 mb-1">Number of Centers</label>
                            <input className={inputCls} type="number" min={1} value={agCollectionCenterCount || ''} onChange={(e) => setAgCollectionCenterCount(Math.max(1, Number(e.target.value)))} disabled={isReadOnly} placeholder="1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">Agreement — Payment Terms</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="radio" name="agPaymentTerms" value="full_upfront" checked={agPaymentTerms === 'full_upfront'} onChange={() => setAgPaymentTerms('full_upfront')} disabled={isReadOnly} />
                        Full Upfront — 100% on signing
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="radio" name="agPaymentTerms" value="50_50" checked={agPaymentTerms === '50_50'} onChange={() => setAgPaymentTerms('50_50')} disabled={isReadOnly} />
                        50% Advance + 50% on Go-Live
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input type="radio" name="agPaymentTerms" value="custom" checked={agPaymentTerms === 'custom'} onChange={() => setAgPaymentTerms('custom')} disabled={isReadOnly} />
                        Custom
                      </label>
                      {agPaymentTerms === 'custom' && (
                        <textarea
                          className={`${inputCls} resize-none mt-1`}
                          rows={2}
                          value={agPaymentTermsCustom}
                          onChange={(e) => setAgPaymentTermsCustom(e.target.value)}
                          disabled={isReadOnly}
                          placeholder="Describe custom payment terms..."
                        />
                      )}
                    </div>
                  </div>

                  {/* Onboarding Date */}
                  <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">Agreement — Onboarding</p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Expected Onboarding Start Date</label>
                      <input className={inputCls} type="date" value={agOnboardingDate} onChange={(e) => setAgOnboardingDate(e.target.value)} disabled={isReadOnly} />
                    </div>
                  </div>

                  {/* Client Signatory */}
                  <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">Agreement — Client Signatory</p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input className={inputCls} value={agClientSignatoryName} onChange={(e) => setAgClientSignatoryName(e.target.value)} disabled={isReadOnly} placeholder="Authorized signatory name" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Designation</label>
                      <input className={inputCls} value={agClientSignatoryDesignation} onChange={(e) => setAgClientSignatoryDesignation(e.target.value)} disabled={isReadOnly} placeholder="Owner / Director / Manager" />
                    </div>
                  </div>
                </>
              )}

              {/* Totals preview */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>Sub Total</span><span className="font-medium">₹{fmtInr(subTotal)}</span></div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-600"><span>Discount</span><span className="font-medium">−₹{fmtInr(discountAmount)}</span></div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between"><span>Taxable Amount</span><span className="font-medium">₹{fmtInr(taxableAmount)}</span></div>
                )}
                <div className="flex justify-between"><span>IGST ({zeroGst ? '0%' : '18%'})</span><span className="font-medium">₹{fmtInr(igst)}</span></div>
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

              {/* Spacer so last item isn't flush against button bar */}
              <div className="h-2" />
            </div>

            {/* Pinned action buttons — never scroll away */}
            {!isReadOnly && (
              <div className="flex-shrink-0 border-t border-gray-200 bg-white pt-3 pb-1 space-y-2">
                {saveMsg && (
                  <p className={`text-xs text-center ${saveMsg.includes('fail') || saveMsg.includes('Fill') ? 'text-red-500' : 'text-green-600'}`}>
                    {saveMsg}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={handleSaveDraft} disabled={isSaving} className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50">
                    {isSaving ? 'Saving…' : 'Save as Draft'}
                  </button>
                  <button onClick={handleDownloadQuotationPDF} className={`flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 ${includeAgreement ? 'text-xs' : ''}`}>
                    {includeAgreement ? 'Quotation PDF' : 'Download PDF'}
                  </button>
                  {includeAgreement && (
                    <button onClick={handleDownloadAgreementPDF} className="flex-1 bg-indigo-600 text-white text-xs font-medium py-2.5 rounded-lg hover:bg-indigo-700">
                      Agreement PDF
                    </button>
                  )}
                </div>
                <button onClick={handleWhatsApp} className="w-full bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-green-700">
                  Send via WhatsApp
                </button>
              </div>
            )}
          </div>

          {/* Right: Preview panel */}
          <div
            className="flex flex-col overflow-hidden rounded-xl border border-gray-200 shadow-sm print:w-full print:border-0 print:shadow-none print:overflow-visible print:h-auto"
            style={{ flex: 1, minWidth: 0 }}
          >
            {/* Preview tabs — only when agreement is included */}
            {includeAgreement && (
              <div className="flex border-b border-gray-200 flex-shrink-0 no-print">
                <button
                  onClick={() => setPreviewTab('quotation')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${previewTab === 'quotation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Quotation
                </button>
                <button
                  onClick={() => setPreviewTab('agreement')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${previewTab === 'agreement' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Agreement
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
              {/* Quotation preview — hidden in screen when agreement tab active; always present for print */}
              <div
                id="qt-wrapper"
                style={{ display: (includeAgreement && previewTab === 'agreement') ? 'none' : undefined }}
                className="print:block"
              >
                <QuotationPreview
                  quoteNumber={savedQuoteNumber}
                  sequenceNumber={savedSeqNumber}
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
                  machinesCount={machinesCount}
                  machinePrice={machinePrice}
                  machineTotal={machineTotal}
                  durationMonths={durationMonths}
                  discountType={discountType}
                  discountValue={discountValue}
                  discountAmount={discountAmount}
                  quoteDate={quoteDate}
                  expiryDate={expiryDate}
                  signatureImageUrl={signatureImageUrl}
                  logoImageUrl={logoImageUrl}
                  signatoryName={signatoryName}
                  signatoryDesignation={signatoryDesignation}
                  zeroGst={zeroGst}
                />
              </div>

              {/* Agreement preview — only rendered when toggle on */}
              {includeAgreement && (
                <div
                  id="ag-wrapper"
                  style={{ display: previewTab === 'quotation' ? 'none' : undefined }}
                  className="print:block"
                >
                  <AgreementPreview
                    quoteNumber={savedQuoteNumber}
                    sequenceNumber={savedSeqNumber}
                    clientName={clientName}
                    clientAddress={clientAddress}
                    clientPhone={clientPhone}
                    displayName={displayName}
                    salespersonEmail={salespersonEmail}
                    planName={planName || '—'}
                    rate={rate}
                    patientRegistrations={patientRegistrations}
                    machinesCount={machinesCount}
                    quoteDate={quoteDate}
                    signatureImageUrl={signatureImageUrl}
                    logoImageUrl={logoImageUrl}
                    signatoryName={signatoryName}
                    signatoryDesignation={signatoryDesignation}
                    agreementData={buildAgreementData()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Drawer — fixed overlay, always on top */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex no-print" aria-modal="true">
          {/* Backdrop */}
          <div className="flex-1 bg-black/30" onClick={() => setHistoryOpen(false)} />
          {/* Drawer */}
          <div className="w-[420px] bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">Quotation History</h3>
              <button onClick={() => setHistoryOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!historyData?.quotations?.length ? (
                <p className="text-sm text-gray-400 py-12 text-center">No quotations saved yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
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
                        <td className="px-4 py-3 text-xs font-mono text-blue-700">
                          {q.sequence_number ? `#${q.sequence_number}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-xs">{q.client_name}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{q.quote_date?.split('T')[0] || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{q.plan_name}</td>
                        <td className="px-4 py-3 text-right text-gray-900 text-xs font-medium">₹{fmtInr(Number(q.total_amount))}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${q.status === 'sent' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                            {q.status === 'sent' ? 'Sent' : 'Draft'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
