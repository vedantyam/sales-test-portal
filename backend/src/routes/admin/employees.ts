import { FastifyPluginAsync } from 'fastify'
import { db } from '../../db/client'
import { generateAccessKey, getKeyPrefix, hashAccessKey, encryptKey, decryptKey } from '../../services/accessKey'
import { enqueueEmail } from '../../services/queue'
import { logAudit } from '../../utils/audit'

export const adminEmployeeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { page = 1, limit = 50, search = '', department = '' } = request.query as any
    const offset = (Number(page) - 1) * Number(limit)

    let where = 'WHERE 1=1'
    const params: unknown[] = []
    let i = 1

    if (search) { where += ` AND (name ILIKE $${i} OR email ILIKE $${i})`; params.push(`%${search}%`); i++ }
    if (department) { where += ` AND department = $${i++}`; params.push(department) }

    const { rows } = await db.query(
      `SELECT id, name, email, department, joining_date, is_active, created_at
       FROM employees ${where}
       ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, limit, offset]
    )

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM employees ${where}`, params
    )

    return reply.send({ employees: rows, total: Number(countRows[0].count) })
  })

  app.post('/', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { name, email, department, joining_date } = request.body as any
    const adminId = request.user.sub

    if (!name?.trim() || !department?.trim()) {
      return reply.status(400).send({ error: 'Name and department are required.' })
    }

    const key = generateAccessKey()
    const hash = await hashAccessKey(key)
    const prefix = getKeyPrefix(key)
    const encrypted = encryptKey(key)

    const { rows } = await db.query(
      `INSERT INTO employees (name, email, department, joining_date, access_key_hash, access_key_prefix, access_key_encrypted, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, name, email, department, joining_date, is_active, created_at`,
      [name.trim(), email?.trim() || null, department.trim(), joining_date || null, hash, prefix, encrypted, adminId]
    )

    if (email?.trim()) {
      await enqueueEmail('access_key', { to: email.trim(), name: name.trim(), accessKey: key })
    }

    await logAudit({
      user_id: adminId,
      user_type: 'admin',
      action: 'employee_created',
      resource: 'employees',
      resource_id: rows[0].id,
      ip_address: request.ip,
    })

    return reply.status(201).send({ employee: rows[0], access_key: key })
  })

  // PATCH and PUT both accepted for update
  async function handleUpdate(request: any, reply: any) {
    const { id } = request.params as any
    const { name, email, department, joining_date } = request.body as any

    if (!name?.trim() || !department?.trim()) {
      return reply.status(400).send({ error: 'Name and department are required.' })
    }

    const { rows } = await db.query(
      `UPDATE employees SET name=$1, email=$2, department=$3, joining_date=COALESCE($4, joining_date)
       WHERE id=$5 RETURNING id, name, email, department, joining_date, is_active, created_at`,
      [name.trim(), email?.trim() || null, department.trim(), joining_date || null, id]
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Employee not found.' })
    return reply.send({ employee: rows[0] })
  }

  app.put('/:id', { preHandler: [app.requireAdmin] }, handleUpdate)
  app.patch('/:id', { preHandler: [app.requireAdmin] }, handleUpdate)

  app.post('/:id/regenerate-key', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any

    const key = generateAccessKey()
    const hash = await hashAccessKey(key)
    const prefix = getKeyPrefix(key)
    const encrypted = encryptKey(key)

    const { rows } = await db.query(
      `UPDATE employees SET access_key_hash=$1, access_key_prefix=$2, access_key_encrypted=$3 WHERE id=$4 RETURNING id, name, email`,
      [hash, prefix, encrypted, id]
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Employee not found.' })

    if (rows[0].email) {
      await enqueueEmail('access_key', { to: rows[0].email, name: rows[0].name, accessKey: key })
    }

    await logAudit({
      user_id: request.user.sub,
      user_type: 'admin',
      action: 'access_key_regenerated',
      resource: 'employees',
      resource_id: id,
      ip_address: request.ip,
    })

    return reply.send({ employee: { id: rows[0].id, name: rows[0].name }, access_key: key })
  })

  app.get('/:id/key', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any

    const { rows } = await db.query(
      `SELECT access_key_encrypted FROM employees WHERE id=$1`,
      [id]
    )
    if (!rows[0]) return reply.status(404).send({ error: 'Employee not found.' })
    if (!rows[0].access_key_encrypted) {
      return reply.status(404).send({ error: 'Key not available. Regenerate to get a new one.' })
    }

    const plainKey = decryptKey(rows[0].access_key_encrypted)

    await logAudit({
      user_id: request.user.sub,
      user_type: 'admin',
      action: 'access_key_revealed',
      resource: 'employees',
      resource_id: id,
      ip_address: request.ip,
    })

    return reply.send({ access_key: plainKey })
  })

  app.patch('/:id/status', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as any
    const { is_active } = request.body as { is_active: boolean }

    const { rows } = await db.query(
      `UPDATE employees SET is_active=$1 WHERE id=$2 RETURNING id, name, is_active`,
      [is_active, id]
    )

    if (!rows[0]) return reply.status(404).send({ error: 'Employee not found.' })
    return reply.send({ employee: rows[0] })
  })
}
