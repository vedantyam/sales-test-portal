export interface PlanFeature {
  id: string
  text: string
  included: boolean
  explanation: string
}

export interface Plan {
  id: string
  name: string
  tagline: string
  price: number
  billingLabel: string
  color: string
  highlight: boolean
  maxBills: string
  features: PlanFeature[]
}

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Perfect for small labs getting started',
    price: 6000,
    billingLabel: 'per year',
    color: '#3b5bdb',
    highlight: false,
    maxBills: '5,000 Annual Bills',
    features: [
      { id: 's1', text: 'Patient Management', included: true, explanation: 'Add patients, track their test history, and access records anytime' },
      { id: 's2', text: 'Report Generation', included: true, explanation: 'Auto-generate professional lab reports for every patient' },
      { id: 's3', text: 'WhatsApp Report Sharing', included: true, explanation: 'Send reports directly to patients on WhatsApp in one click' },
      { id: 's4', text: 'Barcode & QR Support', included: true, explanation: 'Print barcodes on sample tubes and QR codes on reports for easy tracking' },
      { id: 's5', text: 'Basic Analytics Dashboard', included: true, explanation: 'See daily/monthly revenue, test counts, and top tests at a glance' },
      { id: 's6', text: 'Single Centre', included: true, explanation: 'Full access for one lab location' },
      { id: 's7', text: 'Machine Interfacing', included: false, explanation: 'Auto-fetch test results directly from your lab machines (available in Growth+)' },
      { id: 's8', text: 'Multi-Centre Management', included: false, explanation: 'Manage multiple lab locations from one account (available in Leader+)' },
      { id: 's9', text: 'AI Interpretation', included: false, explanation: 'AI explains complex test values in simple language for patients (available in Leader+)' },
      { id: 's10', text: 'B2B Client Portal', included: false, explanation: 'Give hospitals and clinics their own login to track referred patients (available in Leader+)' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For growing labs that need more power',
    price: 9000,
    billingLabel: 'per year',
    color: '#3b5bdb',
    highlight: true,
    maxBills: '15,000 Annual Bills',
    features: [
      { id: 'g1', text: 'All Starter Features', included: true, explanation: 'Everything in the Starter plan is included' },
      { id: 'g2', text: 'Machine Interfacing', included: true, explanation: 'Lab machine results auto-fetch into the software — no manual data entry' },
      { id: 'g3', text: 'QR Code on Bill', included: true, explanation: 'Patients can scan the bill QR to download their report on their phone' },
      { id: 'g4', text: 'Login Tracker', included: true, explanation: 'See who logged in, when, and what they did — full staff activity log' },
      { id: 'g5', text: 'Free Letterhead Design', included: true, explanation: 'Flabs team designs your branded report letterhead at no cost' },
      { id: 'g6', text: 'Quotation Module', included: true, explanation: 'Create professional quotations and agreements for clients directly in the software' },
      { id: 'g7', text: 'Activity Tracking', included: true, explanation: 'Track every change made to bills and reports by your staff' },
      { id: 'g8', text: 'Lab Mobile App', included: true, explanation: 'Your staff can access the lab software from their mobile phones' },
      { id: 'g9', text: 'Department Wise Signature', included: true, explanation: 'Different doctor signatures for different test departments on reports' },
      { id: 'g10', text: 'Multi-Centre Management', included: false, explanation: 'Available in Leader plan' },
      { id: 'g11', text: 'AI Interpretation', included: false, explanation: 'Available in Leader plan' },
      { id: 'g12', text: 'B2B Client Portal', included: false, explanation: 'Available in Leader plan' },
    ],
  },
  {
    id: 'leader',
    name: 'Leader',
    tagline: 'For established labs that want everything',
    price: 13000,
    billingLabel: 'per year',
    color: '#1971c2',
    highlight: false,
    maxBills: 'Unlimited Bills',
    features: [
      { id: 'l1', text: 'All Growth Features', included: true, explanation: 'Everything in the Growth plan is included' },
      { id: 'l2', text: 'Multi-Centre Management', included: true, explanation: 'Control all your lab centres from one single login — see combined reports' },
      { id: 'l3', text: 'AI Interpretation', included: true, explanation: 'AI reads complex blood values and explains them in simple language patients understand' },
      { id: 'l4', text: 'B2B Client Portal', included: true, explanation: 'Hospitals and doctors get their own dashboard to track tests they refer' },
      { id: 'l5', text: 'Outsource Management', included: true, explanation: 'Track tests sent to other labs and manage results when they come back' },
      { id: 'l6', text: 'Advanced Analytics', included: true, explanation: 'Deep reports on revenue, referrals, staff performance, and test trends' },
      { id: 'l7', text: 'Priority Support', included: true, explanation: 'Your queries go to the front of the queue — faster response time' },
      { id: 'l8', text: 'Custom Integrations', included: true, explanation: 'Connect Flabs to your HIS, LIMS, or any other software you use' },
      { id: 'l9', text: 'RIS Module (Optional)', included: true, explanation: 'Add Radiology Information System with Billing + Reporting (additional cost)' },
      { id: 'l10', text: 'Dedicated Account Manager', included: true, explanation: 'One dedicated Flabs person who knows your lab and handles all your needs' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For large lab chains with multiple centres',
    price: 20000,
    billingLabel: 'per year',
    color: '#0c447c',
    highlight: false,
    maxBills: 'Unlimited Bills · Multi-Centre',
    features: [
      { id: 'e1', text: 'All Leader Features', included: true, explanation: 'Every feature from the Leader plan is included' },
      { id: 'e2', text: 'Unlimited Centres', included: true, explanation: 'Manage as many lab centres as you want from one account' },
      { id: 'e3', text: 'Dedicated Account Manager', included: true, explanation: 'A Flabs team member assigned specifically to your lab' },
      { id: 'e4', text: 'Custom API Integrations', included: true, explanation: 'Connect Flabs to your existing hospital software' },
      { id: 'e5', text: 'White-label Reports', included: true, explanation: 'Reports look 100% like your lab brand, no Flabs branding' },
      { id: 'e6', text: 'SLA Support (4hr response)', included: true, explanation: 'Any issue resolved within 4 hours, guaranteed' },
      { id: 'e7', text: 'Custom Training Sessions', included: true, explanation: 'On-site or online training for your entire staff' },
      { id: 'e8', text: 'Data Migration Support', included: true, explanation: 'We move all your existing patient data into Flabs for you' },
      { id: 'e9', text: 'RIS Module Included', included: true, explanation: 'Radiology Information System with Billing + Reporting at no extra cost' },
      { id: 'e10', text: 'Custom Pricing Available', included: true, explanation: 'Volume discounts for large deployments' },
    ],
  },
]
