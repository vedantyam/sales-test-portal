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
    `SELECT id, quote_number, sequence_number, client_name, plan_name, total_amount, quote_date, status, creator_name, creator_email, created_at
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
    ris_features,
    ris_cost,
  } = body

  if (!client_name?.trim() || !plan_name?.trim() || !quote_date || !expiry_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch creator info from DB (prefer salesperson profile display_name/email over employee record)
  const { rows: creatorRows } = await db.query(
    `SELECT COALESCE(sp.display_name, e.name) as creator_name,
            COALESCE(sp.email, e.email) as creator_email
     FROM employees e
     LEFT JOIN salesperson_profiles sp ON sp.employee_id = e.id
     WHERE e.id = $1`,
    [employeeId]
  )
  const creatorName: string = creatorRows[0]?.creator_name || auth.user!.name || ''
  const creatorEmail: string | null = creatorRows[0]?.creator_email || null

  // Generate atomic sequence number — PostgreSQL sequence guarantees no duplicates
  const { rows: seqRows } = await db.query("SELECT nextval('quotation_seq') as seq")
  const seqNum = String(seqRows[0].seq).padStart(6, '0')

  const { rows } = await db.query(
    `INSERT INTO quotations (
      employee_id, client_name, client_address, client_phone, place_of_supply,
      plan_name, plan_rate, patient_registrations, features,
      machines_count, machine_price, machine_total,
      duration_months,
      discount_type, discount_value, discount_amount,
      sub_total, igst_amount, total_amount, quote_date, expiry_date, status,
      include_agreement, agreement_data, zero_gst,
      sequence_number, created_by, creator_name, creator_email,
      ris_features, ris_cost
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
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
      seqNum, employeeId, creatorName, creatorEmail,
      JSON.stringify(ris_features || {}), Number(ris_cost) || 0,
    ]
  )

  await db.query(
    `INSERT INTO quotation_activity_logs (employee_id, quotation_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [employeeId, rows[0].id, 'created', JSON.stringify({ status, plan: plan_name })]
  )

  return NextResponse.json({ quotation: rows[0] }, { status: 201 })
}
