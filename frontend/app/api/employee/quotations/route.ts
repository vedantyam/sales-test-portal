export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { ensureMigrated } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub

  const { rows } = await db.query(
    `SELECT id, quote_number, client_name, plan_name, total_amount, quote_date, status, created_at
     FROM quotations WHERE employee_id = $1 ORDER BY created_at DESC`,
    [employeeId]
  )

  return NextResponse.json({ quotations: rows })
}

export async function POST(request: NextRequest) {
  await ensureMigrated()
  const auth = getAuthUser(request)
  if (auth.error) return auth.error
  if (auth.user!.role !== 'employee') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const employeeId = auth.user!.sub

  const body = await request.json().catch(() => ({}))
  const {
    client_name, client_address, client_phone, place_of_supply,
    plan_name, plan_rate, patient_registrations, features,
    machines_count, machine_price, machine_total,
    duration_months,
    discount_type, discount_value, discount_amount,
    sub_total, igst_amount, total_amount, quote_date, expiry_date,
    status = 'draft',
    include_agreement,
    agreement_data,
    zero_gst,
  } = body

  if (!client_name?.trim() || !plan_name?.trim() || !quote_date || !expiry_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { rows } = await db.query(
    `INSERT INTO quotations (
      employee_id, client_name, client_address, client_phone, place_of_supply,
      plan_name, plan_rate, patient_registrations, features,
      machines_count, machine_price, machine_total,
      duration_months,
      discount_type, discount_value, discount_amount,
      sub_total, igst_amount, total_amount, quote_date, expiry_date, status,
      include_agreement, agreement_data, zero_gst
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    RETURNING *`,
    [
      employeeId, client_name.trim(), client_address || null, client_phone || null, place_of_supply || null,
      plan_name, Number(plan_rate) || 0, patient_registrations || null, JSON.stringify(features || []),
      Number(machines_count) || 0, Number(machine_price) || 0, Number(machine_total) || 0,
      Number(duration_months) || 12,
      discount_type || 'none', Number(discount_value) || 0, Number(discount_amount) || 0,
      Number(sub_total) || 0, Number(igst_amount) || 0, Number(total_amount) || 0,
      quote_date, expiry_date, status,
      Boolean(include_agreement) || false, JSON.stringify(agreement_data || {}), Boolean(zero_gst) || false,
    ]
  )

  await db.query(
    `INSERT INTO quotation_activity_logs (employee_id, quotation_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [employeeId, rows[0].id, 'created', JSON.stringify({ status, plan: plan_name })]
  )

  return NextResponse.json({ quotation: rows[0] }, { status: 201 })
}
