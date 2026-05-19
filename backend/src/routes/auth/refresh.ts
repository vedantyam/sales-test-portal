import { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'

export const refreshRoutes: FastifyPluginAsync = async (app) => {
  app.post('/refresh', async (request, reply) => {
    const token = request.cookies['refresh_token']
    if (!token) return reply.status(401).send({ error: 'No refresh token.' })

    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any
      if (payload.type !== 'refresh') throw new Error('Invalid token type')

      const accessToken = app.jwt.sign({
        sub: payload.sub,
        role: payload.role,
        name: payload.name,
        department: payload.department,
        email: payload.email,
      })

      return reply.send({ access_token: accessToken })
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired refresh token.' })
    }
  })

  app.post('/logout', async (request, reply) => {
    reply.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' })
    return reply.send({ ok: true })
  })
}
