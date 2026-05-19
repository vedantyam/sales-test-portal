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
     WHERE id=$5 RETURNING id, name, email, department, joining_date, is_active, created_at`,
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
