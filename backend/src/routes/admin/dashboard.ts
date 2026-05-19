import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'

export const adminDashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAdmin] }, async (_, reply) => {
    const [empRow, testsRow, resultsRow, auditRows] = await Promise.all([
      db.query('SELECT COUNT(*) FROM employees WHERE is_active=true'),
      db.query(`SELECT COUNT(*) FROM tests WHERE status='published'`),
      db.query(`SELECT COUNT(*) FROM results WHERE is_finalised=false`),
      db.query(
        `SELECT id, user_id, action, resource, resource_id, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT 20`
      ),
    ])

    return reply.send({
      total_employees: Number(empRow.rows[0].count),
      active_tests: Number(testsRow.rows[0].count),
      pending_results: Number(resultsRow.rows[0].count),
      recent_audits: auditRows.rows,
    })
  })
}
