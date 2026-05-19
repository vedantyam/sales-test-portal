import { db } from './db'

interface AuditParams {
  user_id?: string
  user_type?: 'admin' | 'employee'
  action: string
  resource?: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, user_type, action, resource, resource_id, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.user_id || null,
        params.user_type || null,
        params.action,
        params.resource || null,
        params.resource_id || null,
        params.ip_address || null,
        params.user_agent || null,
        JSON.stringify(params.metadata || {}),
      ]
    )
  } catch (e) {
    console.error('Audit log failed:', e)
  }
}
