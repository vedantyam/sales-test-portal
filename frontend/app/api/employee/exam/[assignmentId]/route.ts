export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { fisherYates } from '@/lib/shuffle'

async function submitExam(assignmentId: string, testId: string, employeeId: string, isAuto = false): Promise<void> {
  const { rows: sessionRows } = await db.query(
    'SELECT answer_buffer FROM test_sessions WHERE assignment_id=$1',
    [assignmentId]
  )
  const answerBuffer: Record<string, string> = sessionRows[0]?.answer_buffer || {}

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
      if (answerBuffer[q.id] === q.correct_answer) totalCorrect++
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

export async function GET(request: NextRequest, { params }: { params: { assignmentId: string } }) {
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  const employeeId = auth.user!.sub
  const { assignmentId } = params
  const now = new Date()

  const { rows } = await db.query(
    `SELECT ta.id, ta.test_id, ta.status, ta.window_start, ta.window_end,
            t.duration_minutes, t.sections, t.title
     FROM test_assignments ta JOIN tests t ON t.id=ta.test_id
     WHERE ta.id=$1 AND ta.employee_id=$2`,
    [assignmentId, employeeId]
  )

  const assignment = rows[0]
  if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 })

  if (['submitted', 'auto_submitted'].includes(assignment.status)) {
    const { rows: sess } = await db.query(
      'SELECT submitted_at FROM test_sessions WHERE assignment_id=$1',
      [assignmentId]
    )
    return NextResponse.json({
      assignment_id: assignmentId,
      test_id: assignment.test_id,
      title: assignment.title,
      duration_minutes: assignment.duration_minutes,
      remaining_seconds: 0,
      sections: [],
      answers: {},
      status: assignment.status,
      submitted_at: sess[0]?.submitted_at || null,
    })
  }

  const windowStart = new Date(assignment.window_start)
  const windowEnd = new Date(assignment.window_end)

  if (now < windowStart) {
    return NextResponse.json(
      { error: 'Exam window not open yet.', starts_at: assignment.window_start },
      { status: 403 }
    )
  }
  if (now > windowEnd) {
    await db.query(`UPDATE test_assignments SET status='expired' WHERE id=$1`, [assignmentId])
    return NextResponse.json({ error: 'Exam window expired.' }, { status: 403 })
  }

  const { rows: sessionRows } = await db.query(
    'SELECT * FROM test_sessions WHERE assignment_id=$1',
    [assignmentId]
  )

  let session = sessionRows[0]
  let shuffledSections: any[]
  let remainingSeconds: number

  if (session) {
    const elapsed = Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000)
    const totalSeconds = assignment.duration_minutes * 60
    remainingSeconds = Math.max(0, totalSeconds - elapsed)

    if (remainingSeconds === 0) {
      await submitExam(assignmentId, assignment.test_id, employeeId, true)
      return NextResponse.json({ error: 'Time expired. Exam auto-submitted.' }, { status: 403 })
    }

    shuffledSections = session.question_order
  } else {
    shuffledSections = (assignment.sections as any[]).map((section: any) => ({
      ...section,
      questions: fisherYates(section.questions).map((q: any) => {
        const { correct_answer: _ca, explanation: _ex, ...safe } = q
        return {
          ...safe,
          options: q.type === 'mcq' ? fisherYates(q.options || []) : (q.options || []),
        }
      }),
    }))

    const { rows: newSess } = await db.query(
      `INSERT INTO test_sessions (assignment_id, question_order, answer_buffer)
       VALUES ($1,$2,'{}') RETURNING *`,
      [assignmentId, JSON.stringify(shuffledSections)]
    )
    session = newSess[0]
    remainingSeconds = assignment.duration_minutes * 60

    await db.query(`UPDATE test_assignments SET status='in_progress' WHERE id=$1`, [assignmentId])
  }

  return NextResponse.json({
    assignment_id: assignmentId,
    test_id: assignment.test_id,
    title: assignment.title,
    duration_minutes: assignment.duration_minutes,
    remaining_seconds: remainingSeconds,
    sections: shuffledSections,
    answers: session.answer_buffer || {},
    status: assignment.status === 'pending' ? 'in_progress' : assignment.status,
    submitted_at: null,
  })
}
