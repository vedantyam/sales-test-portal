import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import compress from '@fastify/compress'
import { db } from './db/client'
import { runMigrations } from './db/migrate'
import { initQueue } from './services/queue'
import { authPlugin } from './plugins/auth'
import { employeeAuthRoutes } from './routes/auth/employee'
import { adminAuthRoutes } from './routes/auth/admin'
import { refreshRoutes } from './routes/auth/refresh'
import { adminDashboardRoutes } from './routes/admin/dashboard'
import { adminEmployeeRoutes } from './routes/admin/employees'
import { adminTestRoutes } from './routes/admin/tests'
import { adminAssignmentRoutes } from './routes/admin/assignments'
import { adminResultRoutes } from './routes/admin/results'
import { adminResourceRoutes } from './routes/admin/resources'
import { employeeDashboardRoutes } from './routes/employee/dashboard'
import { employeeExamRoutes } from './routes/employee/exam'
import { employeeResourceRoutes } from './routes/employee/resources'

const app = Fastify({ logger: true, connectionTimeout: 10000 })

async function start() {
  await runMigrations()
  initQueue()

  await app.register(compress, { global: true })

  await app.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['X-Server-Time'],
  })

  await app.register(cookie, {
    secret: process.env.JWT_REFRESH_SECRET!,
  })

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(authPlugin)

  // Expose server time header on every response for client clock drift detection
  app.addHook('onSend', async (_, reply) => {
    reply.header('X-Server-Time', new Date().toISOString())
  })

  await app.register(employeeAuthRoutes, { prefix: '/api/v1/auth/employee' })
  await app.register(adminAuthRoutes, { prefix: '/api/v1/auth/admin' })
  await app.register(refreshRoutes, { prefix: '/api/v1/auth' })

  await app.register(adminDashboardRoutes, { prefix: '/api/v1/admin/dashboard' })
  await app.register(adminEmployeeRoutes, { prefix: '/api/v1/admin/employees' })
  await app.register(adminTestRoutes, { prefix: '/api/v1/admin/tests' })
  await app.register(adminAssignmentRoutes, { prefix: '/api/v1/admin/assignments' })
  await app.register(adminResultRoutes, { prefix: '/api/v1/admin/results' })
  await app.register(adminResourceRoutes, { prefix: '/api/v1/admin/resources' })

  await app.register(employeeDashboardRoutes, { prefix: '/api/v1/employee/dashboard' })
  await app.register(employeeExamRoutes, { prefix: '/api/v1/employee/exam' })
  await app.register(employeeResourceRoutes, { prefix: '/api/v1/employee/resources' })

  app.get('/health', async (_, reply) => {
    reply.header('X-Server-Time', new Date().toISOString())
    return { status: 'ok', time: new Date().toISOString() }
  })

  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, request: { method: request.method, url: request.url } })

    if (error.validation) {
      return reply.status(400).send({ error: 'Validation failed', details: error.validation })
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    return reply.status(500).send({ error: 'Internal server error' })
  })

  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'Unhandled promise rejection')
  })

  await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })

  // Neon keepalive — ping every 4 minutes to prevent cold starts
  setInterval(async () => {
    try {
      await db.query('SELECT 1')
    } catch (e) {
      console.error('Keepalive failed:', e)
    }
  }, 4 * 60 * 1000)
}

start().catch((e) => { console.error(e); process.exit(1) })
