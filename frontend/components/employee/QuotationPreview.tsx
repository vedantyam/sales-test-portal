'use client'

import { amountInWords, fmtInr } from '@/lib/amountInWords'

const TC_ITEMS = [
  'If any new module required will be chargeable as per the work and effort on it.',
  'Any delay in payment will incur interest at 18% per annum.',
  'The company deserves the right to deny any customisation which can impact the software architecture.',
  "Software customisation according to the client's requirement will be charged separately. Minimum time required for developing any feature is one month.",
  'Third-party integration will be chargeable with additional charges.',
  'The client shall bear purchase of all the Standard third party software licenses such as Aisensy etc.',
  'This Quotation is inclusive of all taxes.',
  'Full payment will not be refunded in case of cancellation of the deal after the application is installed or implementation is complete.',
  'Future updates for add-on features (e.g., Phlebo App) will incur additional charges.',
  'Upgraded versions of included modules (e.g., outsourcing) will be provided at no extra cost.',
]

export interface QuotationPreviewProps {
  quoteNumber?: string | null
  sequenceNumber?: string | null
  clientName: string
  clientAddress?: string
  clientPhone?: string
  placeOfSupply?: string
  displayName?: string
  salespersonEmail?: string
  planName: string
  rate: number
  patientRegistrations?: string
  features: string[]
  machinesCount?: number
  machinePrice?: number
  machineTotal?: number
  durationMonths?: number
  discountType?: string
  discountValue?: number
  discountAmount?: number
  quoteDate?: string
  expiryDate?: string
  signatureImageUrl?: string | null
  logoImageUrl?: string | null
  signatoryName?: string | null
  signatoryDesignation?: string | null
  zeroGst?: boolean
  risFeatures?: { billing?: boolean; reporting?: boolean }
  risCost?: number
}

function formatDate(d?: string): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function durationLabel(months: number): string {
  if (months === 1) return '1 Month'
  if (months === 12) return '1 Year'
  if (months === 24) return '2 Years'
  return `${months} Months`
}

export default function QuotationPreview({
  quoteNumber,
  sequenceNumber,
  clientName,
  clientAddress,
  clientPhone,
  placeOfSupply,
  planName,
  rate,
  patientRegistrations,
  features,
  machinesCount = 0,
  machinePrice = 0,
  machineTotal,
  durationMonths = 12,
  discountType = 'none',
  discountValue = 0,
  discountAmount,
  quoteDate,
  expiryDate,
  signatureImageUrl,
  logoImageUrl,
  signatoryName,
  signatoryDesignation,
  zeroGst = false,
  risFeatures,
  risCost = 0,
}: QuotationPreviewProps) {
  const mCount = machinesCount
  const mTotal = machineTotal ?? mCount * machinePrice
  const subTotal = rate + mTotal

  const discAmt = discountAmount !== undefined
    ? discountAmount
    : (discountValue > 0
        ? (discountType === 'percent' ? Math.round(subTotal * discountValue / 100) : discountValue)
        : 0)

  const taxableAmt = subTotal - discAmt
  const igst = zeroGst ? 0 : Math.round(taxableAmt * 0.18)
  const total = taxableAmt + igst

  const lineItemIgstPlan = zeroGst ? 0 : Math.round(rate * 0.18)
  const lineItemIgstMachine = zeroGst ? 0 : Math.round(mTotal * 0.18)

  const showDiscount = discAmt > 0
  const discountLabel = discountType === 'percent'
    ? `Discount (${discountValue}%)`
    : `Discount (₹${fmtInr(discountValue)})`

  return (
    <div
      id="quotation-print-area"
      className="bg-white text-gray-900 w-full"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 11,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      } as React.CSSProperties}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between px-5 py-3"
        style={{ backgroundColor: '#1e2235' }}
      >
        <div>
          {logoImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoImageUrl}
              alt="Company logo"
              style={{ maxHeight: 48, objectFit: 'contain' }}
            />
          ) : (
            <div className="font-bold text-white" style={{ fontSize: 20, letterSpacing: 1 }}>
              flabs
            </div>
          )}
          <div style={{ color: '#9ca3af', fontSize: 9, marginTop: 2 }}>
            Make your diagnostic lab future ready
          </div>
        </div>
        <div className="text-right">
          <div style={{ color: '#60a5fa', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>
            Quotation
          </div>
          <div className="font-bold text-white" style={{ fontSize: 16, marginTop: 3 }}>
            {sequenceNumber ? `#${sequenceNumber}` : (quoteNumber || '#——————')}
          </div>
        </div>
      </div>

      {/* ── From / Bill To ─────────────────────────────────────────────── */}
      <div className="mx-4 mt-3 rounded-lg border border-gray-200 shadow-sm grid grid-cols-2 gap-3 p-3">
        <div>
          <div style={{ color: '#3b5bdb', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            From
          </div>
          <div className="font-bold" style={{ fontSize: 11 }}>Diagnoshuttle Private Limited</div>
          <div className="text-gray-600" style={{ fontSize: 9, marginTop: 3, lineHeight: 1.5 }}>
            SUNIL KUMAR S/o ANOOP SINGH, R/o ANEKKI,<br />
            HETMAPUR, AURANGABAD, Haridwar,<br />
            Uttarakhand 249402
          </div>
          <div className="text-gray-600" style={{ fontSize: 9, marginTop: 2 }}>GSTIN: 05AAKCD0618C1Z7</div>
          <div className="text-gray-600" style={{ fontSize: 9 }}>accounts@flabs.in | flabslis.com</div>
        </div>
        <div>
          <div style={{ color: '#3b5bdb', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
            Bill To
          </div>
          <div className="font-bold" style={{ fontSize: 11 }}>{clientName || 'Client Name'}</div>
          {placeOfSupply && <div className="text-gray-600" style={{ fontSize: 9, marginTop: 3 }}>{placeOfSupply}</div>}
          {clientAddress && <div className="text-gray-600" style={{ fontSize: 9, marginTop: 2, whiteSpace: 'pre-wrap' }}>{clientAddress}</div>}
          {clientPhone && <div className="text-gray-600" style={{ fontSize: 9, marginTop: 2 }}>{clientPhone}</div>}
        </div>
      </div>

      {/* ── Three date/currency boxes ───────────────────────────────────── */}
      <div className="mx-4 mt-2 grid grid-cols-3 gap-2">
        {[
          { label: 'Quote Date', value: formatDate(quoteDate) },
          { label: 'Expiry Date', value: formatDate(expiryDate) },
          { label: 'Currency', value: 'INR (Rs.)' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 p-2 text-center">
            <div style={{ color: '#6b7280', fontSize: 8 }}>{label}</div>
            <div className="font-semibold" style={{ fontSize: 10, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Line Items ─────────────────────────────────────────────────── */}
      <div className="mx-4 mt-3">
        <div style={{ color: '#3b5bdb', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
          Line Items
        </div>
        <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 4 }} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '4px 6px', textAlign: 'left', width: 16 }}>#</th>
              <th style={{ padding: '4px 6px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '4px 6px', textAlign: 'center', width: 54 }}>HSN/SAC</th>
              <th style={{ padding: '4px 6px', textAlign: 'center', width: 30 }}>QTY</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', width: 64 }}>Rate</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', width: 74 }}>IGST</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', width: 64 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
              <td style={{ padding: '5px 6px' }}>1</td>
              <td style={{ padding: '5px 6px' }}>
                <div style={{ fontWeight: 600 }}>{planName || '—'} Subscription Plan For {durationLabel(durationMonths)}</div>
                {patientRegistrations && (
                  <div style={{ color: '#3b5bdb', marginTop: 2 }}>{patientRegistrations}</div>
                )}
                {features.length > 0 && (
                  <ul className="qt-features" style={{ marginTop: 3, paddingLeft: 0, listStyle: 'none' }}>
                    {features.map((f, i) => (
                      <li key={i} style={{ color: '#6b7280', marginBottom: 1 }}>• {f}</li>
                    ))}
                  </ul>
                )}
              </td>
              <td style={{ padding: '5px 6px', textAlign: 'center' }}>997313</td>
              <td style={{ padding: '5px 6px', textAlign: 'center' }}>1.00</td>
              <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(rate)}</td>
              <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(lineItemIgstPlan)} ({zeroGst ? '0' : '18'}%)</td>
              <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(rate)}</td>
            </tr>
            {mCount > 0 && (
              <tr style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                <td style={{ padding: '5px 6px' }}>2</td>
                <td style={{ padding: '5px 6px' }}>
                  <div style={{ fontWeight: 600 }}>Machine Interfacing – One-time Cost ({mCount} machine{mCount !== 1 ? 's' : ''})</div>
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>998314</td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>{mCount}</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(machinePrice)}</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(lineItemIgstMachine)} ({zeroGst ? '0' : '18'}%)</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(mTotal)}</td>
              </tr>
            )}
            {risFeatures && (risFeatures.billing || risFeatures.reporting) && risCost > 0 && (
              <tr style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                <td style={{ padding: '5px 6px' }}>{mCount > 0 ? 3 : 2}</td>
                <td style={{ padding: '5px 6px' }}>
                  <div style={{ fontWeight: 600 }}>RIS (Radiology Information System)</div>
                  <div style={{ color: '#6b7280', marginTop: 2 }}>
                    {[risFeatures.billing && 'Billing', risFeatures.reporting && 'Reporting'].filter(Boolean).join(', ')}
                  </div>
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>998313</td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>1</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(risCost)}</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(zeroGst ? 0 : Math.round(risCost * 0.18))} ({zeroGst ? '0' : '18'}%)</td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{fmtInr(risCost)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Totals ─────────────────────────────────────────────────────── */}
      <div className="mx-4 mt-2 flex justify-end">
        <div style={{ width: 230 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 9, borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ color: '#6b7280' }}>Sub Total</span>
            <span style={{ fontWeight: 500 }}>₹{fmtInr(subTotal)}</span>
          </div>
          {showDiscount && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 9, borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#dc2626' }}>{discountLabel}</span>
                <span style={{ fontWeight: 500, color: '#dc2626' }}>−₹{fmtInr(discAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 9, borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280' }}>Taxable Amount</span>
                <span style={{ fontWeight: 500 }}>₹{fmtInr(taxableAmt)}</span>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 9, borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ color: '#6b7280' }}>IGST ({zeroGst ? '0' : '18'}%)</span>
            <span style={{ fontWeight: 500 }}>₹{fmtInr(igst)}</span>
          </div>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 8px', marginTop: 3, borderRadius: 5,
              backgroundColor: '#3b5bdb', color: 'white', fontWeight: 700, fontSize: 11,
            }}
          >
            <span>TOTAL</span>
            <span>Rs. {fmtInr(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Amount in words ────────────────────────────────────────────── */}
      <div className="mx-4 mt-2">
        <div style={{ color: '#3b5bdb', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
          Amount In Words
        </div>
        <div style={{ color: '#374151', fontSize: 9, fontStyle: 'italic', marginTop: 2 }}>
          {amountInWords(total)}
        </div>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div
        className="mx-4 mt-2 rounded-lg p-2 flex items-start gap-2"
        style={{ backgroundColor: '#eff6ff' }}
      >
        <span style={{ fontSize: 12 }}>💙</span>
        <p style={{ color: '#1d4ed8', fontSize: 9, margin: 0 }}>
          Thank you for being a valued member of the Flabs community. We look forward to contributing to your lab&apos;s success.
        </p>
      </div>

      {/* ── Terms & Conditions ─────────────────────────────────────────── */}
      <div className="mx-4 mt-2">
        <div style={{ color: '#3b5bdb', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
          Terms &amp; Conditions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
          {TC_ITEMS.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 3, fontSize: 8, color: '#4b5563', lineHeight: 1.45 }}>
              <span style={{ fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Signature ──────────────────────────────────────────────────── */}
      <div className="mx-4 mt-3">
        <div style={{ width: 180 }}>
          {signatureImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureImageUrl} alt="Authorized Signature" style={{ maxHeight: 52, maxWidth: 150 }} />
          ) : (
            <div style={{ borderBottom: '2px solid #9ca3af', width: 150, height: 36 }} />
          )}
          <div style={{ fontSize: 8, color: '#6b7280', marginTop: 3 }}>Authorized Signature</div>
          {signatoryName && (
            <div style={{ fontSize: 9, fontWeight: 700, color: '#111827', marginTop: 2 }}>{signatoryName}</div>
          )}
          {signatoryDesignation && (
            <div style={{ fontSize: 9, color: '#374151', marginTop: 1 }}>{signatoryDesignation}</div>
          )}
          <div style={{ fontSize: 9, fontWeight: 600, color: '#111827', marginTop: 2 }}>Diagnoshuttle Private Limited</div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div
        className="mx-4 mt-2 pb-3 pt-2 text-right"
        style={{ borderTop: '1px solid #e5e7eb', fontSize: 8, color: '#9ca3af' }}
      >
        ✉ accounts@flabs.in &nbsp;&nbsp; 📍 flabslis.com
      </div>
    </div>
  )
}
