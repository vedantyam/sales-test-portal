import { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'
import { db } from '../../db/client'
import bcrypt from 'bcrypt'
import { logAudit } from '../../utils/audit'

export const adminAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { email: string; password: string } }>('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password required.' })
    }

    const { rows } = await db.query(
      'SELECT id, name, email, password_hash FROM admins WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    const admin = rows[0]
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return reply.status(401).send({ error: 'Invalid email or password.' })
    }

    const accessToken = app.jwt.sign({
      sub: admin.id,
      role: 'admin',
      name: admin.name,
      email: admin.email,
    })

    const refreshToken = jwt.sign(
      { sub: admin.id, role: 'admin', type: 'refresh' },
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
      user_id: admin.id,
      user_type: 'admin',
      action: 'admin_login_success',
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] as string,
    })

    return reply.send({
      access_token: accessToken,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    })
  })
}
