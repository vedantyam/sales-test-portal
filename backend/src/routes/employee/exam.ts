import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'
import { fisherYates } from '../../utils/shuffle'

async function submitExam(assignmentId: string, testId: string, employeeId: string, isAuto = false): Promise<void> {
  const { rows: sessionRows } = await db.query(
    'SELECT answer_buffer FROM test_sessions WHERE assignment_id=$1', [assignmentId]
  )
  const answerBuffer: Record<string, string> = sessionRows[0]?.answer_buffer || {}

  const { rows: testRows } = await db.query('SELECT sections FROM tests WHERE id=$1', [testId])
  const sections = testRows[0]?.sections || []

  let totalCorrect = 0
  let totalMcq = 0
  let mcqMaxMarks = 0
  let totalMaxMarks = 0

  for (const section of sections) {
    for (const q of section.questions) {
      totalMaxMarks += q.marks || 0
      if (q.type !== 'mcq') continue
      totalMcq++
      mcqMaxMarks += q.marks || 0
      if (answerBuffer[q.id] === q.correct_answer) {
        totalCorrect++
      }
    }
  }

  // MCQ score as percentage 0-100
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

export const employeeExamRoutes: FastifyPluginAsync = async (app) => {
  // GET — start or resume exam, return ExamSession format
  app.get('/:assignmentId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { assignmentId } = request.params as any
    const employeeId = request.user.sub
    const now = new Date()

    const { rows } = await db.query(
      `SELECT ta.id, ta.test_id, ta.status, ta.window_start, ta.window_end,
              t.duration_minutes, t.sections, t.title
       FROM test_assignments ta JOIN tests t ON t.id=ta.test_id
       WHERE ta.id=$1 AND ta.employee_id=$2`,
      [assignmentId, employeeId]
    )

    const assignment = rows[0]
    if (!assignment) return reply.status(404).send({ error: 'Assignment not found.' })

    // Already submitted — return submitted session
    if (['submitted', 'auto_submitted'].includes(assignment.status)) {
      const { rows: sess } = await db.query(
        'SELECT submitted_at FROM test_sessions WHERE assignment_id=$1', [assignmentId]
      )
      return reply.send({
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
      return reply.status(403).send({ error: 'Exam window not open yet.', starts_at: assignment.window_start })
    }
    if (now > windowEnd) {
      await db.query(`UPDATE test_assignments SET status='expired' WHERE id=$1`, [assignmentId])
      return reply.status(403).send({ error: 'Exam window expired.' })
    }

    // Check for existing session
    const { rows: sessionRows } = await db.query(
      'SELECT * FROM test_sessions WHERE assignment_id=$1', [assignmentId]
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
        return reply.status(403).send({ error: 'Time expired. Exam auto-submitted.' })
      }

      shuffledSections = session.question_order
    } else {
      // Create new session with shuffled questions
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

    return reply.send({
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
  })

  app.patch('/:assignmentId/save', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { assignmentId } = request.params as any
    const { answers } = request.body as { answers: Record<string, string> }
    const employeeId = request.user.sub

    const { rows } = await db.query(
      `SELECT ta.status, ta.window_end, ta.test_id
       FROM test_assignments ta WHERE ta.id=$1 AND ta.employee_id=$2`,
      [assignmentId, employeeId]
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Not found.' })
    if (['submitted', 'auto_submitted'].includes(rows[0].status)) {
      return reply.status(403).send({ error: 'Already submitted.' })
    }

    if (new Date() > new Date(rows[0].window_end)) {
      await submitExam(assignmentId, rows[0].test_id, employeeId, true)
      return reply.status(403).send({ error: 'Time expired. Auto-submitted.' })
    }

    await db.query(
      `UPDATE test_sessions SET answer_buffer=$1 WHERE assignment_id=$2`,
      [JSON.stringify(answers), assignmentId]
    )

    return reply.send({ saved: true, saved_at: new Date().toISOString() })
  })

  app.post('/:assignmentId/submit', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { assignmentId } = request.params as any
    const { answers } = request.body as { answers?: Record<string, string>; auto?: boolean }
    const employeeId = request.user.sub

    const { rows } = await db.query(
      `SELECT status, test_id FROM test_assignments WHERE id=$1 AND employee_id=$2`,
      [assignmentId, employeeId]
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Not found.' })
    if (['submitted', 'auto_submitted'].includes(rows[0].status)) {
      return reply.status(403).send({ error: 'Already submitted.' })
    }

    // Save latest answers before scoring
    if (answers) {
      await db.query(
        `UPDATE test_sessions SET answer_buffer=$1 WHERE assignment_id=$2`,
        [JSON.stringify(answers), assignmentId]
      )
    }

    await submitExam(assignmentId, rows[0].test_id, employeeId)
    const submittedAt = new Date().toISOString()
    return reply.send({ submitted: true, submitted_at: submittedAt })
  })
}
