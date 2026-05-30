export interface PlanFeature {
  id: string
  text: string
  included: boolean
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
      { id: 's1', text: 'Patient Management', included: true },
      { id: 's2', text: 'Report Generation', included: true },
      { id: 's3', text: 'WhatsApp Report Sharing', included: true },
      { id: 's4', text: 'Barcode & QR Support', included: true },
      { id: 's5', text: 'Basic Analytics Dashboard', included: true },
      { id: 's6', text: 'Single Centre', included: true },
      { id: 's7', text: 'Machine Interfacing', included: false },
      { id: 's8', text: 'Multi-Centre Management', included: false },
      { id: 's9', text: 'AI Interpretation', included: false },
      { id: 's10', text: 'B2B Client Portal', included: false },
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
      { id: 'g1', text: 'All Starter Features', included: true },
      { id: 'g2', text: 'Machine Interfacing', included: true },
      { id: 'g3', text: 'QR Code on Bill', included: true },
      { id: 'g4', text: 'Login Tracker', included: true },
      { id: 'g5', text: 'Free Letterhead Design', included: true },
      { id: 'g6', text: 'Quotation Module', included: true },
      { id: 'g7', text: 'Activity Tracking', included: true },
      { id: 'g8', text: 'Lab Mobile App', included: true },
      { id: 'g9', text: 'Department Wise Signature', included: true },
      { id: 'g10', text: 'Multi-Centre Management', included: false },
      { id: 'g11', text: 'AI Interpretation', included: false },
      { id: 'g12', text: 'B2B Client Portal', included: false },
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
      { id: 'l1', text: 'All Growth Features', included: true },
      { id: 'l2', text: 'Multi-Centre Management', included: true },
      { id: 'l3', text: 'AI Interpretation', included: true },
      { id: 'l4', text: 'B2B Client Portal', included: true },
      { id: 'l5', text: 'Outsource Management', included: true },
      { id: 'l6', text: 'Advanced Analytics', included: true },
      { id: 'l7', text: 'Priority Support', included: true },
      { id: 'l8', text: 'Custom Integrations', included: true },
      { id: 'l9', text: 'RIS Module (Optional)', included: true },
      { id: 'l10', text: 'Dedicated Account Manager', included: true },
    ],
  },
]
