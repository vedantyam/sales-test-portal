import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'
import { randomUUID } from 'crypto'

export const adminTestRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAdmin] }, async (_, reply) => {
    const { rows } = await db.query(
      `SELECT id, title, description, duration_minutes, pass_score_pct, status, created_at,
              (SELECT COUNT(*) FROM test_assignments WHERE test_id = tests.id) as assignment_count,
              jsonb_array_length(sections) as section_count,
              (SELECT COALESCE(SUM(jsonb_array_length(s->'questions')), 0)
               FROM jsonb_array_elements(sections) s) as total_questions
       FROM tests ORDER BY created_at DESC`
    )
    return reply.send({ tests: rows })
  })

  app.get('/:id', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { rows } = await db.query('SELECT * FROM tests WHERE id=$1', [id])
    if (!rows[0]) return reply.status(404).send({ error: 'Test not found.' })
    return reply.send({ test: rows[0] })
  })

  function normalizeSections(sections: any[]): any[] {
    return (sections || []).map((s: any, si: number) => ({
      ...s,
      id: s.id || randomUUID(),
      order: si + 1,
      questions: (s.questions || []).map((q: any, qi: number) => ({
        ...q,
        id: q.id || randomUUID(),
        order: qi + 1,
      })),
    }))
  }

  app.post('/', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { title, description, guidelines_text, duration_minutes, pass_score_pct, sections } = request.body as any
    const adminId = request.user.sub

    if (!title || !duration_minutes) {
      return reply.status(400).send({ error: 'Title and duration are required.' })
    }

    const normalized = normalizeSections(sections)

    const { rows } = await db.query(
      `INSERT INTO tests (title, description, guidelines_text, duration_minutes, pass_score_pct, sections, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description || null, guidelines_text || null, duration_minutes, pass_score_pct || 60, JSON.stringify(normalized), adminId]
    )

    return reply.status(201).send({ test: rows[0] })
  })

  async function handleTestUpdate(request: any, reply: any) {
    const { id } = request.params as any
    const { title, description, guidelines_text, duration_minutes, pass_score_pct, sections } = request.body as any

    const { rows: existing } = await db.query('SELECT status FROM tests WHERE id=$1', [id])
    if (!existing[0]) return reply.status(404).send({ error: 'Not found.' })
    if (existing[0].status === 'published') {
      return reply.status(403).send({ error: 'Cannot edit a published test. Unpublish first.' })
    }

    const normalized = normalizeSections(sections)

    const { rows } = await db.query(
      `UPDATE tests SET title=$1, description=$2, guidelines_text=$3, duration_minutes=$4,
       pass_score_pct=$5, sections=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [title, description || null, guidelines_text || null, duration_minutes, pass_score_pct || 60, JSON.stringify(normalized), id]
    )

    return reply.send({ test: rows[0] })
  }

  app.put('/:id', { preHandler: [app.requireAdmin] }, handleTestUpdate)
  app.patch('/:id', { preHandler: [app.requireAdmin] }, handleTestUpdate)

  app.patch('/:id/publish', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any

    const { rows: existing } = await db.query('SELECT sections FROM tests WHERE id=$1', [id])
    if (!existing[0]) return reply.status(404).send({ error: 'Not found.' })
    const sections = existing[0].sections as any[]
    if (!sections || sections.length === 0) {
      return reply.status(400).send({ error: 'Cannot publish a test with no sections.' })
    }

    const { rows } = await db.query(
      `UPDATE tests SET status='published', updated_at=NOW() WHERE id=$1 RETURNING id, title, status`,
      [id]
    )
    return reply.send({ test: rows[0] })
  })

  app.patch('/:id/unpublish', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { rows: assignRows } = await db.query(
      `SELECT COUNT(*) FROM test_assignments WHERE test_id=$1 AND status NOT IN ('cancelled','expired')`,
      [id]
    )
    if (Number(assignRows[0].count) > 0) {
      return reply.status(403).send({ error: 'Cannot unpublish — active assignments exist.' })
    }
    const { rows } = await db.query(
      `UPDATE tests SET status='draft', updated_at=NOW() WHERE id=$1 RETURNING id, title, status`, [id]
    )
    return reply.send({ test: rows[0] })
  })

  app.delete('/:id', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { rows: existing } = await db.query('SELECT status FROM tests WHERE id=$1', [id])
    if (!existing[0]) return reply.status(404).send({ error: 'Not found.' })
    if (existing[0].status !== 'draft') {
      return reply.status(403).send({ error: 'Only draft tests can be deleted.' })
    }
    await db.query('DELETE FROM tests WHERE id=$1', [id])
    return reply.send({ deleted: true })
  })
}
