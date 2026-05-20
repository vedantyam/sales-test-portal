export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseScoreFile } from '@/lib/parseExam'

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const adminId = auth.user!.sub
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const testId = formData.get('test_id') as string | null

  if (!file || !testId) {
    return NextResponse.json({ error: 'File and test_id required' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { scores, errors, skipped } = parseScoreFile(buffer)

  if (scores.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: 'No valid scores found', errors }, { status: 400 })
  }

  const { rows: testRows } = await db.query(
    'SELECT sections, pass_score_pct FROM tests WHERE id = $1',
    [testId]
  )
  if (!testRows[0]) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

  const sections = testRows[0].sections || []
  const passPct = testRows[0].pass_score_pct || 60

  const questionMap = new Map<string, string>()
  for (const section of sections) {
    for (const q of section.questions) {
      if (q.type === 'subjective') {
        questionMap.set(q.text.trim().toLowerCase(), q.id)
      }
    }
  }

  const byEmployee = new Map<string, Record<string, number>>()
  const matchErrors: string[] = []

  for (const score of scores) {
    const questionId = questionMap.get(score.question_text.trim().toLowerCase())
    if (!questionId) {
      matchErrors.push(`Row ${score.row_number}: Question not found in test — "${score.question_text.substring(0, 50)}"`)
      continue
    }

    if (!byEmployee.has(score.employee_id)) {
      byEmployee.set(score.employee_id, {})
    }
    byEmployee.get(score.employee_id)![questionId] = score.marks_awarded
  }

  let updated = 0
  let notFound = 0
  const updateErrors: string[] = []

  for (const [employeeId, questionScores] of byEmployee) {
    const { rows: resultRows } = await db.query(
      `SELECT r.id, r.subjective_scores, r.is_finalised
       FROM results r
       JOIN test_assignments ta ON ta.id = r.assignment_id
       WHERE r.test_id = $1 AND r.employee_id = $2`,
      [testId, employeeId]
    )

    if (!resultRows[0]) {
      notFound++
      updateErrors.push(`Employee ID ${employeeId}: No result found for this test`)
      continue
    }

    const result = resultRows[0]
    const existingScores = result.subjective_scores || {}
    const mergedScores = { ...existingScores, ...questionScores }

    await db.query(
      'UPDATE results SET subjective_scores = $1 WHERE id = $2',
      [JSON.stringify(mergedScores), result.id]
    )

    updated++
  }

  let finalised = 0
  const subjectiveQuestions = sections
    .flatMap((s: any) => s.questions)
    .filter((q: any) => q.type === 'subjective')

  for (const [employeeId] of byEmployee) {
    try {
      const { rows: resultRows } = await db.query(
        `SELECT r.id, r.subjective_scores, r.mcq_score, r.is_finalised
         FROM results r
         JOIN test_assignments ta ON ta.id = r.assignment_id
         WHERE r.test_id = $1 AND r.employee_id = $2`,
        [testId, employeeId]
      )

      if (!resultRows[0] || resultRows[0].is_finalised) continue

      const result = resultRows[0]
      const subjectiveScores = result.subjective_scores || {}

      const allScored = subjectiveQuestions.every(
        (q: any) => subjectiveScores[q.id] !== undefined && subjectiveScores[q.id] !== null
      )

      if (!allScored) continue

      let totalSubjectiveMax = 0
      let totalSubjectiveEarned = 0
      for (const q of subjectiveQuestions) {
        totalSubjectiveMax += q.marks || 2
        totalSubjectiveEarned += Number(subjectiveScores[q.id] || 0)
      }

      const subjectiveScore = totalSubjectiveMax > 0
        ? Math.round((totalSubjectiveEarned / totalSubjectiveMax) * 100)
        : null

      const mcqScore = Number(result.mcq_score || 0)
      const hasSubjective = subjectiveQuestions.length > 0

      let totalScore: number
      if (hasSubjective && subjectiveScore !== null) {
        totalScore = Math.round((mcqScore + subjectiveScore) / 2)
      } else {
        totalScore = mcqScore
      }

      const passFail = totalScore >= passPct ? 'pass' : 'fail'

      await db.query(
        `UPDATE results SET
           subjective_score = $1,
           total_score = $2,
           pass_fail = $3,
           is_finalised = true,
           finalised_at = NOW(),
           finalised_by = $4
         WHERE id = $5`,
        [subjectiveScore, totalScore, passFail, adminId, result.id]
      )

      finalised++
    } catch (e) {
      updateErrors.push(`Error finalising employee ${employeeId}: ${(e as Error).message}`)
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      scores_processed: scores.length,
      employees_updated: updated,
      employees_not_found: notFound,
      employees_auto_finalised: finalised,
      skipped_rows: skipped,
    },
    warnings: [...matchErrors, ...updateErrors, ...errors],
  })
}
