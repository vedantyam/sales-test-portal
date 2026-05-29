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

async function submitExam(assignmentId: string, testId: string, employeeId: string): Promise<void> {
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

  await db.query(`UPDATE test_sessions SET submitted_at=NOW() WHERE assignment_id=$1`, [assignmentId])
  await db.query(`UPDATE test_assignments SET status='auto_submitted' WHERE id=$1`, [assignmentId])
  await db.query(
    `INSERT INTO results (assignment_id, employee_id, test_id, mcq_score, max_score)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (assignment_id) DO UPDATE SET mcq_score=$4`,
    [assignmentId, employeeId, testId, mcqScore, totalMaxMarks]
  )
}

export async function PATCH(request: NextRequest, { params }: { params: { assignmentId: string } }) {
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub
  const { assignmentId } = params

  const body = await request.json().catch(() => ({}))
  const { answers } = body as { answers: Record<string, any> }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT ta.status, ta.window_end, ta.test_id
       FROM test_assignments ta WHERE ta.id=$1 AND ta.employee_id=$2 FOR UPDATE`,
      [assignmentId, employeeId]
    )

    if (!rows[0]) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }
    if (['submitted', 'auto_submitted'].includes(rows[0].status)) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Already submitted.' }, { status: 403 })
    }

    if (new Date() > new Date(rows[0].window_end)) {
      await client.query('ROLLBACK')
      await submitExam(assignmentId, rows[0].test_id, employeeId)
      return NextResponse.json({ error: 'Time expired. Auto-submitted.' }, { status: 403 })
    }

    await client.query(
      `UPDATE test_sessions SET answer_buffer=$1 WHERE assignment_id=$2`,
      [JSON.stringify(answers), assignmentId]
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return NextResponse.json({ saved: true, saved_at: new Date().toISOString() })
}
