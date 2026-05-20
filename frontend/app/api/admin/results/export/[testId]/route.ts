export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest, { params }: { params: { testId: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { testId } = params

  const { rows: testRows } = await db.query(
    'SELECT id, title, sections FROM tests WHERE id = $1',
    [testId]
  )
  if (!testRows[0]) return NextResponse.json({ error: 'Test not found' }, { status: 404 })
  const test = testRows[0]

  const { rows: submissions } = await db.query(
    `SELECT
      e.id as employee_id,
      e.name as employee_name,
      e.department,
      e.email,
      ts.answer_buffer,
      r.id as result_id,
      r.mcq_score,
      r.subjective_scores,
      r.is_finalised
     FROM test_assignments ta
     JOIN employees e ON e.id = ta.employee_id
     LEFT JOIN test_sessions ts ON ts.assignment_id = ta.id
     LEFT JOIN results r ON r.assignment_id = ta.id
     WHERE ta.test_id = $1
     AND ta.status IN ('submitted', 'auto_submitted')
     ORDER BY e.name ASC`,
    [testId]
  )

  const sections = test.sections || []

  const headers = [
    'Employee Name',
    'Employee ID',
    'Department',
    'Email',
    'Section',
    'Question No',
    'Question',
    'Type',
    'Employee Answer',
    'Expected Answer',
    'Marks Awarded',
    'Max Marks',
    'Is Correct (MCQ)',
  ]

  const rows: any[] = []

  for (const submission of submissions) {
    const answerBuffer = submission.answer_buffer || {}
    const subjectiveScores = submission.subjective_scores || {}
    let questionNo = 0

    for (const section of sections) {
      for (const question of section.questions) {
        questionNo++
        const rawAnswer = answerBuffer[question.id]

        let answerText = ''
        let explanationText = ''

        if (typeof rawAnswer === 'string') {
          answerText = rawAnswer
        } else if (rawAnswer && typeof rawAnswer === 'object') {
          answerText = rawAnswer.answer || ''
          explanationText = rawAnswer.explanation || ''
        }

        if (question.type === 'mcq') {
          const chosenOption = question.options?.find((o: any) => o.id === answerText)
          const correctOption = question.options?.find((o: any) => o.id === question.correct_answer)
          const isCorrect = answerText === question.correct_answer
          const marksAwarded = isCorrect ? (question.marks || 1) : 0

          rows.push([
            submission.employee_name,
            submission.employee_id,
            submission.department,
            submission.email || '',
            section.name || section.title || '',
            questionNo,
            question.text,
            'MCQ',
            chosenOption?.text || (answerText || 'Not answered'),
            correctOption?.text || '',
            marksAwarded,
            question.marks || 1,
            isCorrect ? 'Yes' : 'No',
          ])

          if (explanationText) {
            rows.push([
              submission.employee_name,
              submission.employee_id,
              submission.department,
              submission.email || '',
              section.name || section.title || '',
              `${questionNo} (reasoning)`,
              `REASONING: ${question.text}`,
              'MCQ Reasoning',
              explanationText,
              '',
              '',
              '',
              '',
            ])
          }
        } else {
          const existingScore = subjectiveScores[question.id]
          rows.push([
            submission.employee_name,
            submission.employee_id,
            submission.department,
            submission.email || '',
            section.name || section.title || '',
            questionNo,
            question.text,
            'Subjective',
            answerText || 'Not answered',
            question.expected_answer || '',
            existingScore !== undefined ? existingScore : '',
            question.marks || 2,
            '',
          ])
        }
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [
    { wch: 20 },
    { wch: 36 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 10 },
    { wch: 50 },
    { wch: 12 },
    { wch: 50 },
    { wch: 50 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Answers')

  const summaryData = [
    ['Test Title', test.title],
    ['Total Employees', submissions.length],
    ['Exported At', new Date().toLocaleString('en-IN')],
    [],
    ['Instructions'],
    ['1. MCQ rows have Marks Awarded already filled — do not change them'],
    ['2. Fill in Marks Awarded for Subjective rows only'],
    ['3. Do not change Employee ID or Question column'],
    ['4. Save and import back into portal'],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Instructions')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `${test.title.replace(/[^a-zA-Z0-9]/g, '_')}_answers_${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
