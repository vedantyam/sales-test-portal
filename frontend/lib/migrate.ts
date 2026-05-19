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

  `CREATE INDEX IF NOT EXISTS idx_employees_prefix ON employees(access_key_prefix)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_employee ON test_assignments(employee_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_test ON test_assignments(test_id)`,
  `CREATE INDEX IF NOT EXISTS idx_results_employee ON results(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_assignment ON test_sessions(assignment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`,
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
