import { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'
import { db } from '../../db/client'
import { verifyAccessKey } from '../../services/accessKey'
import { logAudit } from '../../utils/audit'

export const employeeAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { access_key: string } }>('/login', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
  }, async (request, reply) => {
    const { access_key } = request.body

    if (!access_key?.trim()) {
      return reply.status(400).send({ error: 'Access key is required.' })
    }

    const key = access_key.trim().toUpperCase()
    const prefix = key.substring(0, 4)

    const { rows: candidates } = await db.query(
      `SELECT id, name, department, joining_date, access_key_hash
       FROM employees WHERE access_key_prefix = $1 AND is_active = true`,
      [prefix]
    )

    let matched: any = null
    for (const emp of candidates) {
      if (await verifyAccessKey(key, emp.access_key_hash)) {
        matched = emp
        break
      }
    }

    if (!matched) {
      await logAudit({
        action: 'employee_login_failed',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'] as string,
      })
      return reply.status(401).send({ error: 'Invalid access key. Please check with HR.' })
    }

    const accessToken = app.jwt.sign({
      sub: matched.id,
      role: 'employee',
      name: matched.name,
      department: matched.department,
    })

    const refreshToken = jwt.sign(
      { sub: matched.id, role: 'employee', type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    )

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    })

    await logAudit({
      user_id: matched.id,
      user_type: 'employee',
      action: 'employee_login_success',
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] as string,
    })

    return reply.send({
      access_token: accessToken,
      employee: {
        id: matched.id,
        name: matched.name,
        department: matched.department,
        joining_date: matched.joining_date,
      },
    })
  })
}
