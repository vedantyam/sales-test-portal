import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'

export const employeeDashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assignments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const employeeId = request.user.sub

    await db.query(
      `UPDATE test_assignments SET status='expired'
       WHERE employee_id=$1 AND status IN ('pending','in_progress') AND window_end < NOW()`,
      [employeeId]
    )

    const { rows } = await db.query(
      `SELECT ta.id, ta.status, ta.window_start, ta.window_end, ta.assigned_at,
              t.title, t.description, t.duration_minutes, t.pass_score_pct, t.guidelines_text,
              (SELECT COUNT(*) FROM jsonb_array_elements(t.sections)) as section_count,
              (SELECT COALESCE(SUM(jsonb_array_length(s->'questions')), 0)
               FROM jsonb_array_elements(t.sections) s) as total_questions,
              r.pass_fail, r.total_score, r.is_finalised
       FROM test_assignments ta
       JOIN tests t ON t.id=ta.test_id
       LEFT JOIN results r ON r.assignment_id=ta.id
       WHERE ta.employee_id=$1
       ORDER BY ta.window_start DESC`,
      [employeeId]
    )

    return reply.send({ assignments: rows })
  })
}
