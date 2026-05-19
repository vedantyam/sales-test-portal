export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `SELECT r.id, r.assignment_id, r.employee_id, r.test_id,
            r.mcq_score, r.subjective_score, r.total_score, r.max_score,
            r.pass_fail, r.is_finalised, r.created_at,
            r.subjective_answers,
            e.name as employee_name, e.email as employee_email, e.department as employee_department,
            t.title as test_title, t.sections, t.pass_score_pct,
            ts.answer_buffer, ts.submitted_at
     FROM results r
     JOIN employees e ON e.id = r.employee_id
     JOIN tests t ON t.id = r.test_id
     LEFT JOIN test_sessions ts ON ts.assignment_id = r.assignment_id
     WHERE r.id=$1`,
    [params.id]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const row = rows[0]
  const answerBuffer: Record<string, string> = row.answer_buffer || {}
  const subjectiveAnswers: Record<string, number> = row.subjective_answers || {}
  const sections: any[] = row.sections || []

  const answers: any[] = []
  for (const section of sections) {
    for (const q of section.questions) {
      const rawAnswer = answerBuffer[q.id] || null
      let displayAnswer: string | null = rawAnswer
      let correctAnswerText: string | undefined

      if (q.type === 'mcq' && q.options) {
        if (rawAnswer) {
          const givenOpt = q.options.find((o: any) => o.id === rawAnswer)
          if (givenOpt) displayAnswer = givenOpt.text
        }
        if (q.correct_answer) {
          const correctOpt = q.options.find((o: any) => o.id === q.correct_answer)
          correctAnswerText = correctOpt?.text
        }
      }

      answers.push({
        question_id: q.id,
        question_text: q.text,
        question_type: q.type,
        marks: q.marks,
        answer: displayAnswer,
        correct_answer: correctAnswerText,
        explanation: q.explanation || undefined,
        awarded_marks: q.type === 'subjective' ? (subjectiveAnswers[q.id] ?? null) : null,
      })
    }
  }

  const { rows: decisions } = await db.query(
    `SELECT id, decision, notes, created_at FROM hr_decisions WHERE result_id=$1 ORDER BY created_at ASC`,
    [params.id]
  )

  return NextResponse.json({
    result: {
      id: row.id,
      assignment_id: row.assignment_id,
      employee_id: row.employee_id,
      test_id: row.test_id,
      employee_name: row.employee_name,
      employee_email: row.employee_email,
      employee_department: row.employee_department,
      test_title: row.test_title,
      mcq_score: row.mcq_score,
      subjective_score: row.subjective_score,
      total_score: row.total_score,
      max_score: row.max_score,
      pass_fail: row.pass_fail,
      is_finalised: row.is_finalised,
      submitted_at: row.submitted_at,
      created_at: row.created_at,
      answers,
      hr_decisions: decisions,
    },
  })
}
