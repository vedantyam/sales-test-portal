'use client'

export interface AgreementData {
  client_contact_person?: string
  client_email?: string
  client_gstin?: string
  interfacing_direction?: string
  processing_lab?: boolean
  processing_lab_count?: number
  whatsapp_api?: boolean
  razorpay?: boolean
  collection_center?: boolean
  collection_center_count?: number
  payment_terms?: string
  payment_terms_custom?: string
  onboarding_date?: string
  client_signatory_name?: string
  client_signatory_designation?: string
}

export interface AgreementPreviewProps {
  quoteNumber?: string | null
  sequenceNumber?: string | null
  clientName: string
  clientAddress?: string
  clientPhone?: string
  displayName?: string
  salespersonEmail?: string
  planName: string
  rate: number
  patientRegistrations?: string
  machinesCount?: number
  quoteDate?: string
  signatureImageUrl?: string | null
  logoImageUrl?: string | null
  signatoryName?: string | null
  signatoryDesignation?: string | null
  agreementData?: AgreementData
}

function fmtInr(n: number): string {
  return n.toLocaleString('en-IN')
}

function formatDate(d?: string): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Work Scope data ────────────────────────────────────────────────────────────

interface ScopeRow {
  sno: number
  module: string
  features: string[]
}

const ALL_SCOPE_ROWS: ScopeRow[] = [
  {
    sno: 1,
    module: 'Registration & Billing',
    features: [
      'Quotations', 'Existing Patient Profile', 'Patient Registration', 'Veterinary Registration',
      'Clinical History Addition', 'Edit Patients', 'Test Booking & Package Booking',
      'Discount Management', 'Discount Builder', 'Due Payment Management', 'Payment Collection',
      'Payment Mode Management', 'Test Addition Post Registration',
      'Bill Delivery – WhatsApp, SMS, Email', 'Barcode Generation & Printing',
    ],
  },
  {
    sno: 2,
    module: 'Result Entry',
    features: [
      'Day-wise Patient List', 'Patient Report Status and Segmentation', 'Worksheet Printing',
      'Result Entry', 'Auto-detect Abnormal Values', 'Delta-check', 'Send for Verification',
      'Issue Entry and Re-verification', 'Test Specific Comments', 'Notes Entry',
    ],
  },
  {
    sno: 3,
    module: 'Report Delivery',
    features: ['Link on SMS', 'PDF on WhatsApp', 'PDF on Email', 'Prints Tracking'],
  },
  {
    sno: 4,
    module: 'Business Analytics',
    features: [
      'Daily Sales Overview', 'Top Referrals', 'Test Frequencies', 'Revenue Trends Graphs',
      'Activity Tracking', 'Active Login Tracking', 'User Wise Collection',
    ],
  },
  {
    sno: 5,
    module: 'Financial Analysis',
    features: [
      'MIS Reports', 'Billing wise, Referral wise, Outsource wise',
      'Excel and PDF Export for Financial Reports', 'Data Customisation',
    ],
  },
  {
    sno: 6,
    module: 'Customisation',
    features: [
      'Test Data Customisation', 'Range and Methods for Test Parameters', 'Test Interpretations',
      'Test Input Fields', 'Flag Colors', 'Report Letterhead Design', 'Patient Details Headers',
      'Report Content Spacing & Size', 'Bill Content, GST Details', 'Custom Logo (NABL, ISO etc.)',
    ],
  },
  // Growth additions
  {
    sno: 7,
    module: 'Outsource',
    features: [
      'Test wise and Lab wise addition of data', 'Lab to Lab Rate List',
      'PDF Upload for Outsource Test', 'Financial Analysis for Outsource Lab',
    ],
  },
  {
    sno: 8,
    module: 'Lab Management',
    features: [
      'User Roles and Permission', 'User Logins', 'Referring Organisations',
      'Organization Logins', 'Organization Permission', 'Referral Commission Setup',
      'Multiple Price List', 'Add On Labs',
    ],
  },
  // Leader additions
  {
    sno: 9,
    module: 'Accession',
    features: ['Collect', 'Receive', 'Send For Recollection'],
  },
  {
    sno: 10,
    module: 'B2B / Clients',
    features: [
      'Advanced / Credit system for B2B Clients', 'Client Logins for Creating Orders',
      'Order Dispatch System', 'Client Registration Lock', 'B2B Price List',
      'Client Invoices and Billing', 'Email Report Delivery', 'Payment Verification System',
      'Payment Wallet for B2B Clients', 'Payment Gateway Integration (Razorpay)',
      'Financial Analysis & Settlement History',
    ],
  },
  {
    sno: 11,
    module: 'Mobile App',
    features: ['Admin Management', 'User Management'],
  },
  {
    sno: 12,
    module: 'Inventory',
    features: [
      'Item Addition', 'Multiple Supplier Registration', 'Create Purchase Orders',
      'Auto & Manual Stock Consumption', 'Stock Mapping', 'Low Quantity Alerts',
      'Expiry Date for Items', 'Expenditure',
    ],
  },
]

const PLAN_ROW_COUNT: Record<string, number> = {
  Starter: 6,
  Growth: 8,
  Leader: 12,
  Enterprise: 12,
}

// ── T&C ───────────────────────────────────────────────────────────────────────

const TC_ITEMS = [
  'The vendor will provide all implementation support and ensure smooth execution as per the timeline.',
  'The API for website integration will be provided by us.',
  'Any delay in payment will incur interest at 18% per annum.',
  'If any new module or enhancement is required beyond the agreed scope, it will be evaluated separately and charged based on the effort involved.',
  'The company reserves the right to deny any customisation that may impact the software architecture.',
  'Software customisation per client requirements will be charged separately. Minimum development time for any feature is one month.',
  'Third-party integrations will be chargeable with additional charges (e.g., CRM, etc.).',
  'The above prices are inclusive of all applicable taxes.',
  'The client shall bear the cost of all standard third-party software licences such as AiSensy, etc.',
  'Once the onboarding process has been initiated, the engagement is considered confirmed. As the client proceeds after evaluating the trial version, payments made are non-refundable, except in cases where agreed core functionalities are not delivered. It is understood that while the exact implementation may vary, the solution provided will address the intended use case.',
  'Future updates for add-on features (e.g., Phlebo App) will incur additional charges.',
  'Upgraded versions of included modules (e.g., Outsourcing, Inventory) will be provided at no extra cost and cannot be expedited beyond our planned schedule.',
  'Client data will be kept in safe custody. Any breach shall hold the responsibility for all legal/litigation and loss of reputation/branding. Daily physical backup of data will be facilitated by the provider.',
  'Software training will be provided within one month of onboarding.',
  'Software pricing is subject to an increment of 9% after every 2 years.',
  'The client can download their lab data via the Export option in the software (Excel or PDF).',
  'Resumption of services in case of total failure, hacks, malware, attacks, or phishing from our end will be ensured.',
  'By signing this agreement, the client confirms they have tested the software via free trial and are satisfied with the current version. No customisations other than those explicitly mentioned herein will be included in this plan.',
  'All commercial terms remain aligned with the agreed scope of services.',
]

// ── Styles helpers ────────────────────────────────────────────────────────────

const BLUE = '#2563eb'
const DARK = '#111827'
const BODY = '#374151'
const GREY = '#9ca3af'
const BORDER = '#e5e7eb'
const BG_LIGHT = '#f9fafb'

const sectionHeadingStyle: React.CSSProperties = {
  color: BLUE,
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 8,
  marginTop: 0,
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}

const thStyle: React.CSSProperties = {
  backgroundColor: BLUE,
  color: 'white',
  padding: '12px 14px',
  textAlign: 'left',
  fontWeight: 600,
  border: `1px solid ${BORDER}`,
}

const tdLabelStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontWeight: 600,
  width: '30%',
  backgroundColor: BG_LIGHT,
  border: `1px solid ${BORDER}`,
  verticalAlign: 'top',
  color: DARK,
}

const tdValueStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: `1px solid ${BORDER}`,
  color: BODY,
  verticalAlign: 'top',
}

const dividerStyle: React.CSSProperties = {
  borderTop: `1px solid ${BORDER}`,
  margin: '24px 0',
}

const outerPad = '40px'

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgreementPreview({
  sequenceNumber,
  clientName,
  clientAddress,
  clientPhone,
  displayName,
  salespersonEmail,
  planName,
  rate,
  patientRegistrations,
  machinesCount = 0,
  quoteDate,
  signatureImageUrl,
  logoImageUrl,
  signatoryName,
  signatoryDesignation,
  agreementData = {},
}: AgreementPreviewProps) {
  const scopeRows = ALL_SCOPE_ROWS.slice(0, PLAN_ROW_COUNT[planName] ?? 6)
  const planModuleNames = scopeRows.map((r) => r.module)

  // Financials
  const interfacingDirection = agreementData.interfacing_direction || 'Unidirectional'
  const machineModePrice = interfacingDirection === 'Bidirectional' ? 20000 : 15000
  const machineTotal = machinesCount > 0 ? machinesCount * machineModePrice : 0
  const processingLabCount = agreementData.processing_lab_count ?? 1
  const collectionCenterCount = agreementData.collection_center_count ?? 1
  const processingLabTotal = agreementData.processing_lab ? processingLabCount * 50000 : 0
  const whatsappTotal = agreementData.whatsapp_api ? 25000 : 0
  const razorpayTotal = agreementData.razorpay ? 40000 : 0
  const collectionCenterTotal = agreementData.collection_center ? collectionCenterCount * 8000 : 0
  const subtotal = rate + machineTotal + processingLabTotal + whatsappTotal + razorpayTotal + collectionCenterTotal
  const gst = Math.round(subtotal * 0.18)
  const grandTotal = subtotal + gst

  return (
    <div
      id="agreement-print-area"
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: 13,
        backgroundColor: 'white',
        color: BODY,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      } as React.CSSProperties}
    >
      <div style={{ padding: outerPad, maxWidth: 900, margin: '0 auto' }}>

        {/* ── SECTION A: PAGE HEADER ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            {logoImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl} alt="Flabs logo" style={{ maxHeight: 40, objectFit: 'contain' }} />
            ) : (
              <span style={{ fontWeight: 700, fontSize: 18, color: DARK }}>flabs</span>
            )}
          </div>
          <div>
            <span style={{ color: GREY, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>AGREEMENT</span>
          </div>
        </div>
        <div style={{ height: 2, backgroundColor: BLUE, marginBottom: 3 }} />
        <div style={{ height: 1, backgroundColor: BORDER, marginBottom: 32 }} />

        {/* ── SECTION B: TITLE BLOCK ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: DARK, fontSize: 32, fontWeight: 800, margin: 0 }}>Agreement</h1>
          {sequenceNumber && (
            <p style={{ color: BLUE, fontSize: 12, fontWeight: 600, margin: '6px 0 0' }}>
              For Quotation #{sequenceNumber}
            </p>
          )}
          <p style={{ color: GREY, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: '8px 0 16px' }}>BETWEEN</p>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            {/* Vendor box */}
            <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
              <div style={{ color: BLUE, fontSize: 15, fontWeight: 700 }}>Flabs</div>
              <div style={{ color: GREY, fontSize: 13, marginTop: 4 }}>Diagnoshuttle Private Limited</div>
              <a href="https://www.flabslis.com" style={{ color: BLUE, fontSize: 12, textDecoration: 'underline' }}>www.flabslis.com</a>
            </div>
            {/* Client box */}
            <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
              <div style={{ color: DARK, fontSize: 15, fontWeight: 700 }}>{clientName || '—'}</div>
              <div style={{ color: BODY, fontSize: 13, marginTop: 4 }}>Date: {formatDate(quoteDate)}</div>
            </div>
          </div>
          <div style={dividerStyle} />
        </div>

        {/* ── SECTION C: INTRO ───────────────────────────────────────────────── */}
        <p style={{ fontSize: 13, color: BODY, margin: '20px 0' }}>
          This is a formal work order for the implementation of the Flabs Software, as per our discussions and your proposal. Please find the detailed work scope, timeline, and payment terms below.
        </p>

        {/* ── SECTION D: VENDOR DETAILS ──────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={sectionHeadingStyle}>Vendor Details :-</p>
          <table style={tableStyle}>
            <tbody>
              {[
                ['Vendor Name', 'Flabs (Diagnoshuttle Private Limited)'],
                ['Address', 'Corporate Office: 415, Tower 4, Assotech Business Cresterra, Sector 135, Noida, Uttar Pradesh – 201301'],
                ['Website', 'www.flabslis.com'],
                ['Contact Person', displayName || '—'],
                ['Email', salespersonEmail || '—'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={tdLabelStyle}>{label}</td>
                  <td style={tdValueStyle}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── SECTION E: CLIENT DETAILS ──────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={sectionHeadingStyle}>Client Details :-</p>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={tdLabelStyle}>Client Name</td>
                <td style={tdValueStyle}>{clientName || '—'}</td>
              </tr>
              <tr>
                <td style={tdLabelStyle}>Address</td>
                <td style={tdValueStyle}>{clientAddress || '—'}</td>
              </tr>
              <tr>
                <td style={tdLabelStyle}>Key Contact Person</td>
                <td style={tdValueStyle}>{agreementData.client_contact_person || '—'}</td>
              </tr>
              <tr>
                <td style={tdLabelStyle}>Mobile</td>
                <td style={tdValueStyle}>{clientPhone || '—'}</td>
              </tr>
              <tr>
                <td style={tdLabelStyle}>Email</td>
                <td style={tdValueStyle}>{agreementData.client_email || '—'}</td>
              </tr>
              {agreementData.client_gstin && (
                <tr>
                  <td style={tdLabelStyle}>GSTIN</td>
                  <td style={tdValueStyle}>{agreementData.client_gstin}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── SECTION F: WORK SCOPE ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>
            <span style={{ color: BLUE }}>1.</span>{'  '}Work Scope
          </p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '8%' }}>S.No.</th>
                <th style={{ ...thStyle, width: '22%' }}>Module</th>
                <th style={{ ...thStyle, width: '70%' }}>Features</th>
              </tr>
            </thead>
            <tbody>
              {scopeRows.map((row) => (
                <tr key={row.sno}>
                  <td style={{ ...tdValueStyle, fontWeight: 600, textAlign: 'center' }}>{row.sno}</td>
                  <td style={{ ...tdValueStyle, fontWeight: 600 }}>{row.module}</td>
                  <td style={tdValueStyle}>
                    {row.features.map((f, i) => (
                      <div key={i} style={{ lineHeight: 1.7 }}>{'– '}{f}</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── SECTION G: FINANCIALS ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>
            <span style={{ color: BLUE }}>2.</span>{'  '}Financials
          </p>
          <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 8px', color: DARK }}>Software Subscription (Annual)</p>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '75%' }}>Items</th>
                <th style={{ ...thStyle, width: '25%', textAlign: 'right' }}>Price (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Plan row */}
              <tr>
                <td style={tdValueStyle}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: DARK }}>
                    {planName}{patientRegistrations ? ` (${patientRegistrations} Patient Registrations Per Year)` : ''}
                  </div>
                  {planModuleNames.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: BODY, lineHeight: 1.7 }}>{'– '}{m}</div>
                  ))}
                </td>
                <td style={{ ...tdValueStyle, textAlign: 'right', fontWeight: 600 }}>₹{fmtInr(rate)}</td>
              </tr>
              {/* Machine interfacing row */}
              {machinesCount > 0 && (
                <tr>
                  <td style={{ ...tdValueStyle, fontWeight: 700 }}>
                    Machine Interfacing ({machinesCount} Machine{machinesCount !== 1 ? 's' : ''})
                  </td>
                  <td style={{ ...tdValueStyle, textAlign: 'right', fontWeight: 600 }}>₹{fmtInr(machineTotal)}</td>
                </tr>
              )}
              {/* Processing Lab */}
              {agreementData.processing_lab && (
                <tr>
                  <td style={tdValueStyle}>
                    Processing Lab Addition ({processingLabCount} lab{processingLabCount !== 1 ? 's' : ''})
                  </td>
                  <td style={{ ...tdValueStyle, textAlign: 'right' }}>₹{fmtInr(processingLabTotal)}</td>
                </tr>
              )}
              {/* WhatsApp API */}
              {agreementData.whatsapp_api && (
                <tr>
                  <td style={tdValueStyle}>WhatsApp API Integration</td>
                  <td style={{ ...tdValueStyle, textAlign: 'right' }}>₹{fmtInr(whatsappTotal)}</td>
                </tr>
              )}
              {/* Razorpay */}
              {agreementData.razorpay && (
                <tr>
                  <td style={tdValueStyle}>Razorpay Integration</td>
                  <td style={{ ...tdValueStyle, textAlign: 'right' }}>₹{fmtInr(razorpayTotal)}</td>
                </tr>
              )}
              {/* Collection Center */}
              {agreementData.collection_center && (
                <tr>
                  <td style={tdValueStyle}>
                    Collection Center Addition ({collectionCenterCount} center{collectionCenterCount !== 1 ? 's' : ''})
                  </td>
                  <td style={{ ...tdValueStyle, textAlign: 'right' }}>₹{fmtInr(collectionCenterTotal)}</td>
                </tr>
              )}
              {/* GST */}
              <tr style={{ backgroundColor: BG_LIGHT }}>
                <td style={{ ...tdValueStyle, fontWeight: 700, backgroundColor: BG_LIGHT }}>GST @ 18%</td>
                <td style={{ ...tdValueStyle, textAlign: 'right', fontWeight: 700, backgroundColor: BG_LIGHT }}>₹{fmtInr(gst)}</td>
              </tr>
              {/* Total */}
              <tr style={{ backgroundColor: BLUE }}>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: 'white', border: `1px solid ${BORDER}` }}>Total</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'white', border: `1px solid ${BORDER}` }}>₹ {fmtInr(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Additional Costs descriptions */}
          {(machinesCount > 0 || agreementData.processing_lab || agreementData.collection_center || agreementData.whatsapp_api || agreementData.razorpay) && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: BLUE, fontWeight: 700, fontSize: 14, margin: '0 0 12px' }}>
                Additional Costs (Optional — Based on Requirements)
              </p>
              {machinesCount > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', color: DARK }}>1. Machine Interfacing</p>
                  <p style={{ margin: 0, color: BODY, lineHeight: 1.6 }}>
                    LIS integration with diagnostic machines is available in two modes. Unidirectional (machine → host): ₹15,000 per machine. Bidirectional (both ways): ₹20,000 per machine. A 10% Annual Maintenance Charge (AMC) applies from the second year. The integration timelines may vary depending on machine compatibility, availability of technical documentation, and coordination with the respective teams.
                  </p>
                </div>
              )}
              {agreementData.processing_lab && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', color: DARK }}>2. Processing Lab Addition</p>
                  <p style={{ margin: 0, color: BODY, lineHeight: 1.6 }}>
                    Adding a new processing lab: ₹50,000 per year. Includes user access setup with Super Admin (all labs) and Centre Admin (respective lab only).
                  </p>
                </div>
              )}
              {agreementData.collection_center && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', color: DARK }}>3. Collection Center Addition</p>
                  <p style={{ margin: 0, color: BODY, lineHeight: 1.6 }}>
                    Collection centers (registration & sample collection only): ₹8,000 per center per year. Each center admin gets a separate login with access to their registered patients and completed reports.
                  </p>
                </div>
              )}
              {agreementData.whatsapp_api && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', color: DARK }}>4. WhatsApp API Integration</p>
                  <p style={{ margin: 0, color: BODY, lineHeight: 1.6 }}>
                    Integration via AiSensy for sending reports and bills to patients: ₹25,000 one-time setup. Ongoing API subscription/messaging credits are paid directly to the third-party provider. Message content change fee: ₹1,200 per change. New API data integration: ₹6,000 per API.
                  </p>
                </div>
              )}
              {agreementData.razorpay && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', color: DARK }}>5. Razorpay Integration</p>
                  <p style={{ margin: 0, color: BODY, lineHeight: 1.6 }}>
                    Two modes available: – Razorpay Route via Flabs – No additional cost. B2B client payments processed through Flabs&apos; Razorpay account, then routed to your bank. – Full Integration via Client&apos;s Own Account – One-time cost of ₹40,000. Includes setup, testing, and secure implementation using client&apos;s Razorpay credentials.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION H: PAYMENT ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>
            <span style={{ color: BLUE }}>3.</span>{'  '}Payment
          </p>
          <div style={{ border: `1px solid ${BLUE}`, borderRadius: 8, padding: 16, backgroundColor: '#f0f7ff', marginBottom: 16 }}>
            <p style={{ color: BLUE, fontWeight: 700, fontSize: 14, margin: '0 0 8px' }}>Payment Details</p>
            <p style={{ fontWeight: 700, margin: '0 0 8px', color: DARK }}>Mode: Online Transfer / UPI</p>
            <div style={{ color: BODY, lineHeight: 1.8 }}>
              <div>Account Holder: Diagnoshuttle Private Limited</div>
              <div>Account Number: 50200082600172</div>
              <div>IFSC Code: HDFC0007955</div>
              <div>UPI ID: 9568561582@hdfc</div>
            </div>
          </div>
          <div style={{ color: BODY, fontSize: 13 }}>
            {agreementData.payment_terms === '50_50'
              ? 'Payment Terms: 50% advance on signing. Balance 50% due on go-live.'
              : agreementData.payment_terms === 'custom'
                ? `Payment Terms: ${agreementData.payment_terms_custom || '—'}`
                : 'Payment Terms: 100% payment due on signing of agreement.'}
          </div>
        </div>

        {/* ── SECTION I: PREREQUISITES ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>
            <span style={{ color: BLUE }}>4.</span>{'  '}Prerequisites
          </p>
          <p style={{ fontWeight: 700, margin: '0 0 8px', color: DARK }}>Equipment List</p>
          <p style={{ color: BODY, margin: '0 0 16px', lineHeight: 1.6 }}>
            The client will provide a list of all machines to be interfaced by Flabs, along with the LIS Host manual for each machine. Technical specifications must be fulfilled as per the LIS Prerequisites document.
          </p>
          <p style={{ fontWeight: 700, margin: '0 0 8px', color: DARK }}>Onboarding Checklist</p>
          <p style={{ color: BODY, margin: '0 0 8px', lineHeight: 1.6 }}>Client needs to provide the following items for onboarding:</p>
          {['Signatory details', 'User details with their roles and permissions', 'Report and bill letterhead'].map((item, i) => (
            <div key={i} style={{ color: BODY, lineHeight: 1.8 }}>{'– '}{item}</div>
          ))}
          <div style={dividerStyle} />
          <p style={{ color: BODY, fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
            Data support during onboarding will be provided where feasible, however certain elements such as historical report formats from previous systems may have limitations in migration.
          </p>
        </div>

        {/* ── SECTION J: SUPPORT ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>
            <span style={{ color: BLUE }}>5.</span>{'  '}Support
          </p>
          <p style={{ color: BODY, margin: '0 0 16px', lineHeight: 1.6 }}>
            Online support will be provided by Flabs. For any queries, lab users or admin can raise support tickets, after which our support team will connect for resolution. Support is intended for software-related queries and smooth functioning of the system, while operational activities such as bulk data handling or non-urgent requests are generally managed during standard working hours. Training will be provided during onboarding to enable effective usage of the software, and continued efficiency depends on active participation of the client&apos;s team. Additional training sessions, if required beyond the initial scope, may be arranged at mutually agreed terms.
          </p>
          <p style={{ fontWeight: 700, margin: '0 0 8px', color: DARK }}>Scope of Support</p>
          <p style={{ color: BODY, margin: '0 0 12px' }}>Support covers software interruptions and training for configuring software.</p>
          <p style={{ fontWeight: 700, margin: '0 0 8px', color: DARK }}>Excluded from support scope:</p>
          {['Data Entry', 'Test Configuration', 'Price Updates', 'Hardware-related support'].map((item, i) => (
            <div key={i} style={{ color: BODY, lineHeight: 1.8 }}>{'– '}{item}</div>
          ))}
        </div>

        {/* ── SECTION K: TRANSITION ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>
            <span style={{ color: BLUE }}>6.</span>{'  '}Transition Phase
          </p>
          <p style={{ color: BODY, margin: '0 0 16px', lineHeight: 1.6 }}>
            For smooth onboarding, it is mandatory to start using the trial software at least 10 days prior to terminating the previous software. This allows sufficient time to configure and get familiar with Flabs before going live.
          </p>
          <div style={dividerStyle} />
          <p style={{ color: BODY, margin: '0 0 16px', lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: BLUE }}>Onboarding Timeline</span>: The onboarding process would take around 15 to 20 days, subject to timely sharing of required details, approvals, and coordination from the client&apos;s team to ensure smooth and timely implementation.
          </p>
          <div style={dividerStyle} />
          {agreementData.onboarding_date && (
            <p style={{ color: BODY, margin: 0 }}>
              Expected Onboarding Start Date: {formatDate(agreementData.onboarding_date)}
            </p>
          )}
        </div>

        {/* ── SECTION L: T&C ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 12px' }}>
            <span style={{ color: BLUE }}>7.</span>{'  '}Terms &amp; Conditions
          </p>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {TC_ITEMS.map((item, i) => (
              <li key={i} style={{ color: BODY, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
                {item}
              </li>
            ))}
          </ol>
        </div>

        {/* ── SECTION M: SIGNATURES ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: GREY, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' }}>
            AGREEMENT ACKNOWLEDGMENT
          </p>
          <h2 style={{ color: DARK, fontSize: 28, fontWeight: 800, margin: '0 0 16px' }}>Signatures</h2>
          <p style={{ color: BODY, margin: '0 0 24px', lineHeight: 1.6 }}>
            By signing below, both parties acknowledge their understanding and acceptance of the scope of work, timelines, and responsibilities outlined in this agreement.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Client signature box */}
            <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <p style={{ color: BODY, fontWeight: 600, margin: '0 0 16px' }}>For: {clientName || '—'}</p>
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>NAME</p>
              <p style={{ color: DARK, fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{agreementData.client_signatory_name || '—'}</p>
              <div style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }} />
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>DESIGNATION</p>
              <p style={{ color: DARK, fontSize: 14, margin: '0 0 8px' }}>{agreementData.client_signatory_designation || '—'}</p>
              <div style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }} />
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>SIGNATURE</p>
              <div style={{ height: 60, borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }} />
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>DATE</p>
              <div style={{ borderBottom: `1px solid ${BORDER}` }} />
            </div>

            {/* Vendor signature box */}
            <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20 }}>
              <p style={{ color: BODY, fontWeight: 600, margin: '0 0 16px' }}>For: Flabs (Diagnoshuttle Pvt. Ltd.)</p>
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>NAME</p>
              <p style={{ color: DARK, fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{signatoryName || '—'}</p>
              <div style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }} />
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>DESIGNATION</p>
              <p style={{ color: DARK, fontSize: 14, margin: '0 0 8px' }}>{signatoryDesignation || '—'}</p>
              <div style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }} />
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>SIGNATURE</p>
              {signatureImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureImageUrl} alt="Signature" style={{ maxHeight: 60, objectFit: 'contain', display: 'block', marginBottom: 4 }} />
              ) : (
                <div style={{ height: 60 }} />
              )}
              <div style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: 12 }} />
              <p style={{ color: GREY, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>DATE</p>
              <div style={{ borderBottom: `1px solid ${BORDER}` }} />
            </div>
          </div>
        </div>

        {/* ── SECTION N: FOOTER ──────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 24 }}>
          <span style={{ color: GREY, fontSize: 11 }}>Flabs (Diagnoshuttle Private Limited)</span>
        </div>

      </div>
    </div>
  )
}
