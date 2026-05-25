export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { testId: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { rows } = await db.query(
    `SELECT
      e.id as employee_id,
      e.name as employee_name,
      e.department,
      e.email,
      r.id as result_id,
      r.mcq_score,
      r.subjective_scores,
      r.part_scores,
      r.total_score,
      r.max_score,
      r.pass_fail,
      r.is_finalised,
      r.is_released,
      ts.answer_buffer,
      ts.submitted_at,
      ts.tab_switch_count,
      t.sections,
      t.pass_score_pct
    FROM test_assignments ta
    JOIN employees e ON e.id = ta.employee_id
    JOIN tests t ON t.id = ta.test_id
    LEFT JOIN test_sessions ts ON ts.assignment_id = ta.id
    LEFT JOIN results r ON r.assignment_id = ta.id
    WHERE ta.test_id = $1
    AND ta.status IN ('submitted', 'auto_submitted')
    ORDER BY e.name ASC`,
    [params.testId]
  )

  if (rows.length === 0) {
    return NextResponse.json({ employees: [], sections: [] })
  }

  const sections: any[] = rows[0].sections || []

  const employees = rows.map(row => {
    const answerBuffer: Record<string, any> = row.answer_buffer || {}
    const subjectiveScores: Record<string, number> = row.subjective_scores || {}
    const partScores: Record<string, Array<{ part_id: string; score: number }>> = row.part_scores || {}

    const answers: any[] = []
    for (const section of sections) {
      for (const q of section.questions) {
        const rawVal = answerBuffer[q.id] ?? null

        if (q.type === 'parts') {
          const partAnswers = rawVal?.part_answers ?? []
          const qPartScores = partScores[q.id] ?? []
          const awarded = qPartScores.reduce((sum: number, ps: any) => sum + Number(ps.score || 0), 0)
          answers.push({
            question_id: q.id,
            question_text: q.text,
            question_type: 'parts',
            marks: q.marks,
            answer: null,
            parts: q.parts ?? [],
            part_answers: partAnswers,
            part_scores: qPartScores,
            awarded_marks: qPartScores.length > 0 ? awarded : null,
          })
          continue
        }

        let answerStr: string | null = null
        let employeeExplanation: string | null = null

        if (rawVal !== null) {
          if (typeof rawVal === 'object' && 'answer' in rawVal) {
            answerStr = rawVal.answer || null
            employeeExplanation = rawVal.explanation || null
          } else {
            answerStr = typeof rawVal === 'string' ? rawVal : null
          }
        }

        const isCorrect = q.type === 'mcq' ? answerStr === q.correct_answer : undefined

        let displayAnswer: string | null = answerStr
        let correctAnswerText: string | undefined

        if (q.type === 'mcq' && q.options) {
          const givenOpt = q.options.find((o: any) => o.id === answerStr)
          if (givenOpt) displayAnswer = givenOpt.text
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
          is_correct: isCorrect,
          awarded_marks: q.type === 'subjective' ? (subjectiveScores[q.id] ?? null) : null,
          employee_explanation: employeeExplanation || undefined,
        })
      }
    }

    return {
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      department: row.department,
      email: row.email,
      result_id: row.result_id,
      mcq_score: row.mcq_score,
      subjective_scores: subjectiveScores,
      part_scores: partScores,
      total_score: row.total_score,
      max_score: row.max_score,
      pass_fail: row.pass_fail,
      is_finalised: row.is_finalised ?? false,
      is_released: row.is_released ?? false,
      submitted_at: row.submitted_at,
      tab_switch_count: row.tab_switch_count ?? 0,
      answers,
    }
  })

  return NextResponse.json({ employees, sections })
}
