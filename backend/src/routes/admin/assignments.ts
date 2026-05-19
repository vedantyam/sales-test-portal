import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'

export const adminAssignmentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { test_id, employee_ids, window_start, window_end } = request.body as any
    const adminId = request.user.sub

    if (!test_id || !employee_ids?.length || !window_start || !window_end) {
      return reply.status(400).send({ error: 'test_id, employee_ids, window_start, window_end required.' })
    }

    if (new Date(window_end) <= new Date(window_start)) {
      return reply.status(400).send({ error: 'window_end must be after window_start.' })
    }

    const { rows: testRows } = await db.query('SELECT status FROM tests WHERE id=$1', [test_id])
    if (!testRows[0] || testRows[0].status !== 'published') {
      return reply.status(400).send({ error: 'Test must be published before assigning.' })
    }

    const created = []
    const skipped = []

    for (const empId of employee_ids) {
      try {
        const { rows } = await db.query(
          `INSERT INTO test_assignments (employee_id, test_id, window_start, window_end, assigned_by)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [empId, test_id, window_start, window_end, adminId]
        )
        created.push(rows[0])
      } catch (e: any) {
        if (e.code === '23505') skipped.push(empId)
        else throw e
      }
    }

    return reply.status(201).send({ created, skipped })
  })

  app.get('/', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { test_id, employee_id } = request.query as any
    let where = 'WHERE 1=1'
    const params: any[] = []
    let i = 1
    if (test_id) { where += ` AND ta.test_id=$${i++}`; params.push(test_id) }
    if (employee_id) { where += ` AND ta.employee_id=$${i++}`; params.push(employee_id) }

    const { rows } = await db.query(
      `SELECT ta.*, e.name as employee_name, e.department, t.title as test_title
       FROM test_assignments ta
       JOIN employees e ON e.id = ta.employee_id
       JOIN tests t ON t.id = ta.test_id
       ${where} ORDER BY ta.assigned_at DESC`,
      params
    )
    return reply.send({ assignments: rows })
  })

  app.delete('/:id', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { rows } = await db.query('SELECT status FROM test_assignments WHERE id=$1', [id])
    if (!rows[0]) return reply.status(404).send({ error: 'Not found.' })
    if (rows[0].status !== 'pending') {
      return reply.status(403).send({ error: 'Can only cancel pending assignments.' })
    }
    await db.query(`UPDATE test_assignments SET status='cancelled' WHERE id=$1`, [id])
    return reply.send({ cancelled: true })
  })
}
