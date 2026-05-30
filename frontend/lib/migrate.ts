import { db } from './db'

const statements = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  `CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    department TEXT NOT NULL,
    joining_date DATE DEFAULT CURRENT_DATE,
    access_key_hash TEXT UNIQUE NOT NULL,
    access_key_prefix VARCHAR(4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    guidelines_text TEXT,
    duration_minutes INTEGER NOT NULL,
    pass_score_pct INTEGER NOT NULL DEFAULT 60,
    sections JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    test_id UUID NOT NULL REFERENCES tests(id),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','in_progress','submitted','auto_submitted','expired','cancelled')),
    assigned_by UUID REFERENCES admins(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, test_id)
  )`,

  `CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID UNIQUE NOT NULL REFERENCES test_assignments(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    question_order JSONB NOT NULL DEFAULT '[]',
    answer_buffer JSONB NOT NULL DEFAULT '{}',
    tab_switch_count INTEGER DEFAULT 0,
    violations JSONB DEFAULT '[]',
    is_valid BOOLEAN DEFAULT TRUE
  )`,

  `CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID UNIQUE NOT NULL REFERENCES test_assignments(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    test_id UUID NOT NULL REFERENCES tests(id),
    mcq_score NUMERIC,
    subjective_score NUMERIC,
    total_score NUMERIC,
    max_score NUMERIC,
    pass_fail TEXT CHECK (pass_fail IN ('pass','fail','pending')) DEFAULT 'pending',
    section_scores JSONB DEFAULT '{}',
    subjective_answers JSONB DEFAULT '{}',
    is_finalised BOOLEAN DEFAULT FALSE,
    finalised_at TIMESTAMPTZ,
    finalised_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS hr_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL REFERENCES results(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    decision TEXT NOT NULL CHECK (decision IN ('hire','reject','hold')),
    notes TEXT,
    decided_by UUID NOT NULL REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    category TEXT,
    uploaded_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_type TEXT CHECK (user_type IN ('admin','employee')),
    action TEXT NOT NULL,
    resource TEXT,
    resource_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `ALTER TABLE results ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE results ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ`,
  `ALTER TABLE results ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES admins(id)`,

  /* Plain-text access key stored for internal HR tool — admin-only retrieval */
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS access_key_plain TEXT`,

  `CREATE INDEX IF NOT EXISTS idx_employees_prefix ON employees(access_key_prefix)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_employee ON test_assignments(employee_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_test ON test_assignments(test_id)`,
  `CREATE INDEX IF NOT EXISTS idx_results_employee ON results(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_assignment ON test_sessions(assignment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`,

  `CREATE TABLE IF NOT EXISTS resource_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `ALTER TABLE resources ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES resource_folders(id)`,

  `ALTER TABLE results ADD COLUMN IF NOT EXISTS subjective_scores JSONB DEFAULT '{}'`,

  `CREATE TABLE IF NOT EXISTS training_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    departments TEXT[] NOT NULL DEFAULT '{"Sales","Support"}',
    order_index INTEGER DEFAULT 0,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS training_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS training_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES training_chapters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    youtube_url TEXT,
    doc_url TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES training_topics(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, topic_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_training_chapters_course ON training_chapters(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_training_topics_chapter ON training_topics(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_training_progress_employee ON training_progress(employee_id)`,

  // ── Quotation module ──────────────────────────────────────────────────────
  `CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1`,

  `CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT UNIQUE NOT NULL DEFAULT 'QT-' || LPAD(nextval('quote_number_seq')::TEXT, 6, '0'),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_address TEXT,
    client_phone TEXT,
    place_of_supply TEXT,
    plan_name TEXT NOT NULL,
    plan_rate NUMERIC NOT NULL,
    patient_registrations TEXT,
    features JSONB NOT NULL DEFAULT '[]',
    sub_total NUMERIC NOT NULL,
    igst_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    quote_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS salesperson_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_image_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES employees(id)
  )`,

  `CREATE TABLE IF NOT EXISTS quotation_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  `INSERT INTO company_settings (id)
   SELECT gen_random_uuid()
   WHERE NOT EXISTS (SELECT 1 FROM company_settings LIMIT 1)`,

  `CREATE INDEX IF NOT EXISTS idx_quotations_employee ON quotations(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status)`,
  `CREATE INDEX IF NOT EXISTS idx_qal_quotation ON quotation_activity_logs(quotation_id)`,

  `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS logo_image_url TEXT`,

  // Parts question type support
  `ALTER TABLE results ADD COLUMN IF NOT EXISTS part_scores JSONB DEFAULT '{}'`,

  // Machine interfacing
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS machines_count INTEGER DEFAULT 0`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS machine_price NUMERIC DEFAULT 0`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS machine_total NUMERIC DEFAULT 0`,

  // Subscription duration
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 12`,

  // Discount
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none'`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0`,

  // Signatory details
  `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS signatory_name TEXT`,
  `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS signatory_designation TEXT`,

  // Agreement feature
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS include_agreement BOOLEAN DEFAULT false`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS agreement_data JSONB DEFAULT '{}'`,

  // Zero GST option
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS zero_gst BOOLEAN DEFAULT false`,

  // Phase 1: atomic sequence number starting from 000920, creator tracking
  `CREATE SEQUENCE IF NOT EXISTS quotation_seq START 920 INCREMENT 1`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sequence_number TEXT UNIQUE`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by UUID`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS creator_name TEXT`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS creator_email TEXT`,

  // Phase 3: RIS module for Leader/Enterprise plans
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS ris_features JSONB DEFAULT '{}'`,
  `ALTER TABLE quotations ADD COLUMN IF NOT EXISTS ris_cost NUMERIC DEFAULT 0`,

  // Phase 3: phone numbers for employees and admins
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone TEXT`,

  // Call report leaderboard
  `CREATE TABLE IF NOT EXISTS call_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('1PM', '6PM')),
    sales_team JSONB NOT NULL DEFAULT '[]',
    enterprise_team JSONB NOT NULL DEFAULT '[]',
    low_performers JSONB NOT NULL DEFAULT '[]',
    team_total JSONB NOT NULL DEFAULT '{}',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_date, report_type)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_call_reports_date ON call_reports(report_date DESC)`,
]

async function doMigrations(): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for (const sql of statements) {
      await client.query(sql)
    }
    await client.query('COMMIT')
    console.log('Migrations complete')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Migration failed:', e)
    throw e
  } finally {
    client.release()
  }
}

export { doMigrations as runMigrations }

let migrationPromise: Promise<void> | null = null

export function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = doMigrations().catch((e) => {
      migrationPromise = null
      throw e
    })
  }
  return migrationPromise
}
