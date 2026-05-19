export interface Employee {
  id: string
  name: string
  email: string
  department: string
  is_active: boolean
  created_at: string
}

export interface QuestionOption {
  id: string
  text: string
}

export interface Question {
  id: string
  type: 'mcq' | 'subjective'
  text: string
  options?: QuestionOption[]
  correct_answer?: string
  explanation?: string
  marks: number
  word_limit?: number
}

export interface Section {
  id: string
  title: string
  questions: Question[]
}

export interface Test {
  id: string
  title: string
  description?: string
  duration_minutes: number
  sections: Section[]
  status: 'draft' | 'published'
  created_at: string
}

export interface Assignment {
  id: string
  employee_id: string
  test_id: string
  status: 'pending' | 'in_progress' | 'submitted' | 'auto_submitted' | 'expired'
  started_at: string | null
  submitted_at: string | null
  window_start: string
  window_end: string
  test_title?: string
  duration_minutes?: number
  section_count?: number
  total_questions?: number
  pass_fail?: 'pass' | 'fail' | null
  total_score?: number | null
  is_finalised?: boolean
  tab_switch_count?: number
}

export interface ShuffledQuestion {
  id: string
  type: 'mcq' | 'subjective'
  text: string
  options?: QuestionOption[]
  marks: number
  word_limit?: number
}

export interface ShuffledSection {
  id: string
  title: string
  questions: ShuffledQuestion[]
}

export interface ExamSession {
  assignment_id: string
  test_id: string
  title: string
  duration_minutes: number
  remaining_seconds: number
  sections: ShuffledSection[]
  answers: Record<string, string>
  status: string
  submitted_at: string | null
}

export interface ResultSummary {
  id: string
  assignment_id: string
  employee_id: string
  employee_name: string
  employee_email: string
  employee_department: string
  test_id: string
  test_title: string
  mcq_score: number | null
  subjective_score: number | null
  total_score: number | null
  max_score: number | null
  pass_fail: 'pass' | 'fail' | null
  is_finalised: boolean
  submitted_at: string
  created_at: string
}

export interface ResultDetail extends ResultSummary {
  answers: SessionAnswer[]
  hr_decisions: HRDecision[]
}

export interface SessionAnswer {
  question_id: string
  question_text: string
  question_type: 'mcq' | 'subjective'
  marks: number
  answer: string | null
  correct_answer?: string
  explanation?: string
  awarded_marks: number | null
}

export interface HRDecision {
  id: string
  decision: 'hire' | 'reject' | 'hold'
  notes: string | null
  created_at: string
}

export interface Resource {
  id: string
  title: string
  description: string | null
  url: string
  category: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  admin_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface DashboardStats {
  total_employees: number
  active_tests: number
  pending_results: number
  recent_audits: AuditLog[]
}
