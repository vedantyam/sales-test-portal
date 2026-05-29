export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

function getAnswer(buffer: any, questionId: string): string | null {
  const val = buffer[questionId]
  if (!val) return null
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val.answer || null
  return null
}

async function submitExam(assignmentId: string, testId: string, employeeId: string, isAuto = false): Promise<void> {
  const { rows: sessionRows } = await db.query(
    'SELECT answer_buffer FROM test_sessions WHERE assignment_id=$1',
    [assignmentId]
  )
  const answerBuffer = sessionRows[0]?.answer_buffer || {}
  const { rows: testRows } = await db.query('SELECT sections FROM tests WHERE id=$1', [testId])
  const sections = testRows[0]?.sections || []

  let totalCorrect = 0
  let totalMcq = 0
  let totalMaxMarks = 0

  for (const section of sections) {
    for (const q of section.questions) {
      totalMaxMarks += q.marks || 0
      if (q.type !== 'mcq') continue
      totalMcq++
      if (getAnswer(answerBuffer, q.id) === q.correct_answer) totalCorrect++
    }
  }

  const mcqScore = totalMcq > 0 ? Math.round((totalCorrect / totalMcq) * 100) : null
  const status = isAuto ? 'auto_submitted' : 'submitted'

  await db.query(`UPDATE test_sessions SET submitted_at=NOW() WHERE assignment_id=$1`, [assignmentId])
  await db.query(`UPDATE test_assignments SET status=$1 WHERE id=$2`, [status, assignmentId])
  await db.query(
    `INSERT INTO results (assignment_id, employee_id, test_id, mcq_score, max_score)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (assignment_id) DO UPDATE SET mcq_score=$4`,
    [assignmentId, employeeId, testId, mcqScore, totalMaxMarks]
  )
}

export async function POST(request: NextRequest, { params }: { params: { assignmentId: string } }) {
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub
  const { assignmentId } = params

  const body = await request.json().catch(() => ({}))
  const { answers, auto } = body as { answers?: Record<string, any>; auto?: boolean }

  const { rows } = await db.query(
    `SELECT status, test_id, window_end FROM test_assignments WHERE id=$1 AND employee_id=$2`,
    [assignmentId, employeeId]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (['submitted', 'auto_submitted'].includes(rows[0].status)) {
    return NextResponse.json({ error: 'Already submitted.' }, { status: 403 })
  }

  const windowEnd = new Date(rows[0].window_end).getTime()
  if (Date.now() > windowEnd + 30_000) {
    return NextResponse.json({ error: 'Exam window has closed' }, { status: 403 })
  }

  if (answers) {
    await db.query(
      `UPDATE test_sessions SET answer_buffer=$1 WHERE assignment_id=$2`,
      [JSON.stringify(answers), assignmentId]
    )
  }

  await submitExam(assignmentId, rows[0].test_id, employeeId, auto)
  return NextResponse.json({ submitted: true, submitted_at: new Date().toISOString() })
}
