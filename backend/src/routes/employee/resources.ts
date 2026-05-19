import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'

export const employeeResourceRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.authenticate] }, async (_, reply) => {
    const { rows } = await db.query(
      'SELECT id, title, description, url, category, created_at FROM resources ORDER BY created_at DESC'
    )
    return reply.send({ resources: rows })
  })
}
