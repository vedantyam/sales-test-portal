import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'

export const adminResourceRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAdmin] }, async (_, reply) => {
    const { rows } = await db.query(
      'SELECT id, title, description, url, category, created_at FROM resources ORDER BY created_at DESC'
    )
    return reply.send({ resources: rows })
  })

  app.post('/', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { title, description, url, category } = request.body as any
    const adminId = request.user.sub

    if (!title?.trim() || !url?.trim()) {
      return reply.status(400).send({ error: 'Title and URL are required.' })
    }

    try { new URL(url) } catch { return reply.status(400).send({ error: 'Invalid URL.' }) }

    const { rows } = await db.query(
      `INSERT INTO resources (title, description, url, category, uploaded_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, title, description, url, category, created_at`,
      [title.trim(), description?.trim() || null, url.trim(), category?.trim() || null, adminId]
    )
    return reply.status(201).send({ resource: rows[0] })
  })

  app.delete('/:id', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { rowCount } = await db.query('DELETE FROM resources WHERE id=$1', [id])
    if (!rowCount) return reply.status(404).send({ error: 'Not found.' })
    return reply.send({ deleted: true })
  })
}
