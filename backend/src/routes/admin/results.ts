import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'
import { enqueueEmail } from '../../services/queue'
import { logAudit } from '../../utils/audit'

export const adminResultRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAdmin] }, async (_, reply) => {
    const { rows } = await db.query(
      `SELECT r.id, r.assignment_id, r.employee_id, r.test_id,
              r.mcq_score, r.subjective_score, r.total_score, r.max_score,
              r.pass_fail, r.is_finalised, r.created_at,
              e.name as employee_name, e.email as employee_email, e.department as employee_department,
              t.title as test_title,
              ts.submitted_at
       FROM results r
       JOIN employees e ON e.id = r.employee_id
       JOIN tests t ON t.id = r.test_id
       LEFT JOIN test_sessions ts ON ts.assignment_id = r.assignment_id
       ORDER BY r.created_at DESC`
    )
    return reply.send({ results: rows })
  })

  app.get('/:id', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any

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
      [id]
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Not found.' })

    const row = rows[0]
    const answerBuffer: Record<string, string> = row.answer_buffer || {}
    const subjectiveAnswers: Record<string, number> = row.subjective_answers || {}
    const sections: any[] = row.sections || []

    // Build structured answers array
    const answers: any[] = []
    for (const section of sections) {
      for (const q of section.questions) {
        const userAnswer = answerBuffer[q.id] || null
        let correctAnswerText: string | undefined
        if (q.type === 'mcq' && q.correct_answer && q.options) {
          const opt = q.options.find((o: any) => o.id === q.correct_answer)
          correctAnswerText = opt?.text
        }
        answers.push({
          question_id: q.id,
          question_text: q.text,
          question_type: q.type,
          marks: q.marks,
          answer: userAnswer,
          correct_answer: correctAnswerText,
          explanation: q.explanation || undefined,
          awarded_marks: q.type === 'subjective' ? (subjectiveAnswers[q.id] ?? null) : null,
        })
      }
    }

    // Get HR decisions (allow multiple over time)
    const { rows: decisions } = await db.query(
      `SELECT id, decision, notes, created_at FROM hr_decisions WHERE result_id=$1 ORDER BY created_at ASC`,
      [id]
    )

    const result = {
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
    }

    return reply.send({ result })
  })

  // Per-question subjective scoring
  app.patch('/:id/score', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { question_id, marks } = request.body as { question_id: string; marks: number }

    const { rows: existing } = await db.query('SELECT is_finalised FROM results WHERE id=$1', [id])
    if (!existing[0]) return reply.status(404).send({ error: 'Not found.' })
    if (existing[0].is_finalised) return reply.status(403).send({ error: 'Result already finalised.' })

    await db.query(
      `UPDATE results
       SET subjective_answers = jsonb_set(COALESCE(subjective_answers, '{}'), $1, to_jsonb($2::numeric))
       WHERE id=$3`,
      [`{${question_id}}`, marks, id]
    )

    return reply.send({ saved: true })
  })

  app.post('/:id/finalise', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const adminId = request.user.sub

    const { rows } = await db.query(
      `SELECT r.*, t.pass_score_pct, t.sections,
              e.email as employee_email, e.name as employee_name, t.title as test_title
       FROM results r
       JOIN tests t ON t.id=r.test_id
       JOIN employees e ON e.id=r.employee_id
       WHERE r.id=$1`,
      [id]
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Not found.' })
    if (rows[0].is_finalised) return reply.status(403).send({ error: 'Already finalised.' })

    const result = rows[0]
    const subjectiveAnswers: Record<string, number> = result.subjective_answers || {}
    const sections: any[] = result.sections || []

    // Compute max_score and total subjective marks
    let maxScore = 0
    let subjectiveTotal = 0
    let subjectiveMax = 0

    for (const section of sections) {
      for (const q of section.questions) {
        maxScore += q.marks || 0
        if (q.type === 'subjective') {
          subjectiveMax += q.marks || 0
          subjectiveTotal += subjectiveAnswers[q.id] || 0
        }
      }
    }

    const mcqScore = result.mcq_score !== null ? Number(result.mcq_score) : null
    const subjectiveScore = subjectiveMax > 0 ? subjectiveTotal : null

    let rawTotal = 0
    if (mcqScore !== null) {
      // mcq_score is percentage 0-100; convert to actual marks
      const mcqMax = maxScore - subjectiveMax
      rawTotal += Math.round((mcqScore / 100) * mcqMax)
    }
    if (subjectiveScore !== null) rawTotal += subjectiveScore

    const pct = maxScore > 0 ? Math.round((rawTotal / maxScore) * 100) : 0
    const passFail = pct >= result.pass_score_pct ? 'pass' : 'fail'

    await db.query(
      `UPDATE results SET
         subjective_score=$1, total_score=$2, max_score=$3, pass_fail=$4,
         is_finalised=true, finalised_at=NOW(), finalised_by=$5
       WHERE id=$6`,
      [subjectiveScore, rawTotal, maxScore, passFail, adminId, id]
    )

    if (result.employee_email) {
      await enqueueEmail('result', {
        to: result.employee_email,
        name: result.employee_name,
        testTitle: result.test_title,
        score: rawTotal,
        passFail,
      })
    }

    await logAudit({
      user_id: adminId,
      user_type: 'admin',
      action: 'result_finalised',
      resource: 'results',
      resource_id: id,
      ip_address: request.ip,
    })

    return reply.send({ finalised: true, pass_fail: passFail, total_score: rawTotal, max_score: maxScore })
  })

  app.post('/:id/hr-decision', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { decision, notes } = request.body as any
    const adminId = request.user.sub

    if (!decision) return reply.status(400).send({ error: 'Decision is required.' })

    const { rows: resultRows } = await db.query(
      'SELECT id, employee_id, is_finalised FROM results WHERE id=$1', [id]
    )
    if (!resultRows[0]) return reply.status(404).send({ error: 'Result not found.' })
    if (!resultRows[0].is_finalised) {
      return reply.status(403).send({ error: 'Finalise result before recording decision.' })
    }

    const { rows } = await db.query(
      `INSERT INTO hr_decisions (result_id, employee_id, decision, notes, decided_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, decision, notes, created_at`,
      [id, resultRows[0].employee_id, decision, notes?.trim() || null, adminId]
    )

    await logAudit({
      user_id: adminId,
      user_type: 'admin',
      action: 'hr_decision_recorded',
      resource: 'hr_decisions',
      resource_id: rows[0].id,
      metadata: { decision },
      ip_address: request.ip,
    })

    return reply.status(201).send({ decision: rows[0] })
  })
}
