export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { sendResultEmail } from '@/lib/email'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error
  const adminId = auth.user!.sub

  const { rows } = await db.query(
    `SELECT r.*, t.pass_score_pct, t.sections,
            e.email as employee_email, e.name as employee_name, t.title as test_title
     FROM results r
     JOIN tests t ON t.id=r.test_id
     JOIN employees e ON e.id=r.employee_id
     WHERE r.id=$1`,
    [params.id]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (rows[0].is_finalised) return NextResponse.json({ error: 'Already finalised.' }, { status: 403 })

  const result = rows[0]
  const subjectiveAnswers: Record<string, number> = result.subjective_answers || {}
  const sections: any[] = result.sections || []

  let maxScore = 0
  let subjectiveTotal = 0
  let subjectiveMax = 0

  for (const section of sections) {
    for (const q of section.questions) {
      maxScore += q.marks || 0
      if (q.type === 'subjective') {
        subjectiveMax += q.marks || 0
        subjectiveTotal += subjectiveAnswers[q.id] || 0
      }
    }
  }

  const mcqScore = result.mcq_score !== null ? Number(result.mcq_score) : null
  const subjectiveScore = subjectiveMax > 0 ? subjectiveTotal : null

  let rawTotal = 0
  if (mcqScore !== null) {
    const mcqMax = maxScore - subjectiveMax
    rawTotal += Math.round((mcqScore / 100) * mcqMax)
  }
  if (subjectiveScore !== null) rawTotal += subjectiveScore

  const pct = maxScore > 0 ? Math.round((rawTotal / maxScore) * 100) : 0
  const passFail = pct >= result.pass_score_pct ? 'pass' : 'fail'

  await db.query(
    `UPDATE results SET
       subjective_score=$1, total_score=$2, max_score=$3, pass_fail=$4,
       is_finalised=true, finalised_at=NOW(), finalised_by=$5
     WHERE id=$6`,
    [subjectiveScore, rawTotal, maxScore, passFail, adminId, params.id]
  )

  if (result.employee_email) {
    sendResultEmail(result.employee_email, result.employee_name, result.test_title, rawTotal, passFail)
  }

  logAudit({
    user_id: adminId,
    user_type: 'admin',
    action: 'result_finalised',
    resource: 'results',
    resource_id: params.id,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
  })

  return NextResponse.json({ finalised: true, pass_fail: passFail, total_score: rawTotal, max_score: maxScore })
}
