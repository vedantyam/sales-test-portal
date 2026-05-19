import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateAccessKey, getKeyPrefix, hashAccessKey } from '@/lib/accessKey'
import { sendAccessKeyEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { id } = params
  const key = generateAccessKey()
  const hash = await hashAccessKey(key)
  const prefix = getKeyPrefix(key)

  const { rows } = await db.query(
    `UPDATE employees SET access_key_hash=$1, access_key_prefix=$2 WHERE id=$3 RETURNING id, name, email`,
    [hash, prefix, id]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

  if (rows[0].email) {
    sendAccessKeyEmail(rows[0].email, rows[0].name, key)
  }

  logAudit({
    user_id: auth.user!.sub,
    user_type: 'admin',
    action: 'access_key_regenerated',
    resource: 'employees',
    resource_id: id,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
  })

  return NextResponse.json({ employee: { id: rows[0].id, name: rows[0].name }, access_key: key })
}
