import fp from 'fastify-plugin'
import fjwt from '@fastify/jwt'
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      role: 'admin' | 'employee'
      name?: string
      department?: string
      email?: string
      type?: string
    }
    user: {
      sub: string
      role: 'admin' | 'employee'
      name?: string
      department?: string
      email?: string
      type?: string
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(fjwt, {
    secret: process.env.JWT_ACCESS_SECRET!,
    sign: { expiresIn: '15m' },
  })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  app.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      if (request.user.role !== 'admin') {
        reply.status(403).send({ error: 'Forbidden' })
      }
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
})
