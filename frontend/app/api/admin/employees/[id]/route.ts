export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

async function handleUpdate(request: NextRequest, id: string) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({}))
  const { name, email, department, joining_date } = body

  if (!name?.trim() || !department?.trim()) {
    return NextResponse.json({ error: 'Name and department are required.' }, { status: 400 })
  }

  const { rows } = await db.query(
    `UPDATE employees SET name=$1, email=$2, department=$3, joining_date=COALESCE($4, joining_date)
     WHERE id=$5 AND tenant_id IS NULL RETURNING id, name, email, department, joining_date, is_active, created_at`,
    [name.trim(), email?.trim() || null, department.trim(), joining_date || null, id]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })
  return NextResponse.json({ employee: rows[0] })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(request, params.id)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return handleUpdate(request, params.id)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const { id } = params

  const { rows: activeSessions } = await db.query(
    `SELECT COUNT(*) FROM test_assignments ta
     JOIN test_sessions ts ON ts.assignment_id = ta.id
     WHERE ta.employee_id = $1 AND ta.status = 'in_progress'`,
    [id]
  )

  if (Number(activeSessions[0].count) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete — employee is currently taking an exam' },
      { status: 403 }
    )
  }

  await db.query(`DELETE FROM hr_decisions WHERE employee_id = $1`, [id])
  await db.query(`DELETE FROM results WHERE employee_id = $1`, [id])
  await db.query(
    `DELETE FROM test_sessions WHERE assignment_id IN
     (SELECT id FROM test_assignments WHERE employee_id = $1)`,
    [id]
  )
  await db.query(`DELETE FROM test_assignments WHERE employee_id = $1`, [id])
  await db.query(`DELETE FROM employees WHERE id = $1`, [id])

  return NextResponse.json({ deleted: true })
}
