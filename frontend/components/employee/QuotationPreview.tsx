'use client'

import { amountInWords, fmtInr } from '@/lib/amountInWords'

const TC_ITEMS = [
  'If any new module required will be chargeable as per the work and effort on it.',
  'Any delay in payment will incur interest at 18% per annum.',
  'The company deserves the right to deny any customisation which can impact the software architecture.',
  'Software customisation according to the client\'s requirement will be charged separately. Minimum time required for developing any feature is one month.',
  'Third-party integration will be chargeable with additional charges.',
  'The client shall bear purchase of all the Standard third party software licenses such as Aisensy etc.',
  'This Quotation is inclusive of all taxes.',
  'Full payment will not be refunded in case of cancellation of the deal after the application is installed or implementation is complete.',
  'Future updates for add-on features (e.g., Phlebo App) will incur additional charges.',
  'Upgraded versions of included modules (e.g., outsourcing) will be provided at no extra cost.',
]

export interface QuotationPreviewProps {
  quoteNumber?: string | null
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
  quoteDate?: string
  expiryDate?: string
  signatureImageUrl?: string | null
}

function formatDate(d?: string): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function QuotationPreview({
  quoteNumber,
  clientName,
  clientAddress,
  clientPhone,
  placeOfSupply,
  planName,
  rate,
  patientRegistrations,
  features,
  quoteDate,
  expiryDate,
  signatureImageUrl,
}: QuotationPreviewProps) {
  const igst = Math.round(rate * 0.18)
  const total = rate + igst

  return (
    <div
      className="bg-white text-gray-900 w-full"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }}
      id="quotation-print-area"
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-6 py-5"
        style={{ backgroundColor: '#1e2235' }}
      >
        <div>
          <div
            className="font-bold text-white"
            style={{ fontSize: 22, letterSpacing: 1 }}
          >
            flabs
          </div>
          <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 3 }}>
            Make your diagnostic lab future ready
          </div>
        </div>
        <div className="text-right">
          <div style={{ color: '#60a5fa', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
            Quotation
          </div>
          <div className="font-bold text-white" style={{ fontSize: 18, marginTop: 4 }}>
            {quoteNumber || '#QT-——————'}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="mx-5 mt-4 rounded-lg border border-gray-200 shadow-sm grid grid-cols-2 gap-4 p-4">
        <div>
          <div style={{ color: '#3b5bdb', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
            From
          </div>
          <div className="font-bold" style={{ fontSize: 12 }}>Diagnoshuttle Private Limited</div>
          <div className="text-gray-600" style={{ fontSize: 10, marginTop: 4, lineHeight: 1.6 }}>
            SUNIL KUMAR S/o ANOOP SINGH, R/o ANEKKI,<br />
            HETMAPUR, AURANGABAD, Haridwar,<br />
            Uttarakhand 249402
          </div>
          <div className="text-gray-600" style={{ fontSize: 10, marginTop: 2 }}>GSTIN: 05AAKCD0618C1Z7</div>
          <div className="text-gray-600" style={{ fontSize: 10 }}>accounts@flabs.in | flabslis.com</div>
        </div>
        <div>
          <div style={{ color: '#3b5bdb', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
            Bill To
          </div>
          <div className="font-bold" style={{ fontSize: 12 }}>{clientName || 'Client Name'}</div>
          {placeOfSupply && (
            <div className="text-gray-600" style={{ fontSize: 10, marginTop: 4 }}>{placeOfSupply}</div>
          )}
          {clientAddress && (
            <div className="text-gray-600" style={{ fontSize: 10, marginTop: 2, whiteSpace: 'pre-wrap' }}>{clientAddress}</div>
          )}
          {clientPhone && (
            <div className="text-gray-600" style={{ fontSize: 10, marginTop: 2 }}>{clientPhone}</div>
          )}
        </div>
      </div>

      {/* Three boxes */}
      <div className="mx-5 mt-3 grid grid-cols-3 gap-3">
        {[
          { label: 'Quote Date', value: formatDate(quoteDate) },
          { label: 'Expiry Date', value: formatDate(expiryDate) },
          { label: 'Currency', value: 'INR (Rs.)' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 p-2 text-center">
            <div style={{ color: '#6b7280', fontSize: 9 }}>{label}</div>
            <div className="font-semibold" style={{ fontSize: 11, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Line items */}
      <div className="mx-5 mt-5">
        <div style={{ color: '#3b5bdb', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          Line Items
        </div>
        <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 6 }} />

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', width: 20 }}>#</th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: 60 }}>HSN/SAC</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: 36 }}>QTY</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', width: 70 }}>Rate</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', width: 80 }}>IGST</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', width: 70 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>
              <td style={{ padding: '8px' }}>1</td>
              <td style={{ padding: '8px' }}>
                <div style={{ fontWeight: 600 }}>{planName || '—'} Subscription Plan For 1 Year</div>
                {patientRegistrations && (
                  <div style={{ color: '#3b5bdb', marginTop: 2 }}>{patientRegistrations}</div>
                )}
                {features.length > 0 && (
                  <ul style={{ marginTop: 4, paddingLeft: 0, listStyle: 'none' }}>
                    {features.map((f, i) => (
                      <li key={i} style={{ color: '#6b7280', marginBottom: 1 }}>• {f}</li>
                    ))}
                  </ul>
                )}
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>997313</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>1.00</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>₹{fmtInr(rate)}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>₹{fmtInr(igst)} (18%)</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>₹{fmtInr(rate)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mx-5 mt-3 flex justify-end">
        <div style={{ width: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10, borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ color: '#6b7280' }}>Sub Total</span>
            <span style={{ fontWeight: 500 }}>₹{fmtInr(rate)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10, borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ color: '#6b7280' }}>IGST (18%)</span>
            <span style={{ fontWeight: 500 }}>₹{fmtInr(igst)}</span>
          </div>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 10px', marginTop: 4, borderRadius: 6,
              backgroundColor: '#3b5bdb', color: 'white', fontWeight: 700, fontSize: 12,
            }}
          >
            <span>TOTAL</span>
            <span>Rs. {fmtInr(total)}</span>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div className="mx-5 mt-4">
        <div style={{ color: '#3b5bdb', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
          Amount In Words
        </div>
        <div style={{ color: '#374151', fontSize: 10, fontStyle: 'italic', marginTop: 3 }}>
          {amountInWords(total)}
        </div>
      </div>

      {/* Notes */}
      <div
        className="mx-5 mt-4 rounded-lg p-3 flex items-start gap-2"
        style={{ backgroundColor: '#eff6ff' }}
      >
        <span style={{ fontSize: 14 }}>💙</span>
        <p style={{ color: '#1d4ed8', fontSize: 10, margin: 0 }}>
          Thank you for being a valued member of the Flabs community. We look forward to contributing to your lab&apos;s success.
        </p>
      </div>

      {/* T&C */}
      <div className="mx-5 mt-4">
        <div style={{ color: '#3b5bdb', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          Terms &amp; Conditions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px' }}>
          {TC_ITEMS.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 4, fontSize: 9, color: '#4b5563', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signature */}
      <div className="mx-5 mt-5">
        <div style={{ width: 160 }}>
          {signatureImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureImageUrl} alt="Authorized Signature" style={{ maxHeight: 60, maxWidth: 160 }} />
          ) : (
            <div style={{ borderBottom: '2px solid #9ca3af', width: '100%', height: 40 }} />
          )}
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>Authorized Signature</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#111827' }}>Diagnoshuttle Private Limited</div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mx-5 mt-4 pb-5 pt-3 text-right"
        style={{ borderTop: '1px solid #e5e7eb', fontSize: 9, color: '#9ca3af' }}
      >
        ✉ accounts@flabs.in &nbsp;&nbsp; 📍 flabslis.com
      </div>
    </div>
  )
}
