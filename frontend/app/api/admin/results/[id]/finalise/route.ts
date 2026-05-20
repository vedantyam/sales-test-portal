export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error
  const adminId = auth.user!.sub

  const { rows } = await db.query(
    `SELECT r.*, t.pass_score_pct, t.sections
     FROM results r JOIN tests t ON t.id=r.test_id
     WHERE r.id=$1`,
    [params.id]
  )

  if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (rows[0].is_finalised) return NextResponse.json({ error: 'Already finalised.' }, { status: 403 })

  const result = rows[0]
  const sections: any[] = result.sections || []
  const subjectiveScores: Record<string, number> = result.subjective_scores || {}

  let totalSubjectiveMax = 0
  let totalSubjectiveEarned = 0
  let subjectiveCount = 0
  let totalMaxMarks = 0

  for (const section of sections) {
    for (const q of section.questions) {
      totalMaxMarks += q.marks || 0
      if (q.type === 'subjective') {
        const maxMarks = q.marks || 2
        totalSubjectiveMax += maxMarks
        totalSubjectiveEarned += Number(subjectiveScores[q.id] || 0)
        subjectiveCount++
      }
    }
  }

  const mcqScore = result.mcq_score !== null ? Number(result.mcq_score) : null

  const subjectiveScore = totalSubjectiveMax > 0
    ? Math.round((totalSubjectiveEarned / totalSubjectiveMax) * 100)
    : null

  let totalScore: number
  if (subjectiveCount > 0 && mcqScore !== null) {
    totalScore = Math.round((mcqScore + (subjectiveScore || 0)) / 2)
  } else if (subjectiveCount > 0) {
    totalScore = subjectiveScore || 0
  } else {
    totalScore = mcqScore || 0
  }

  const passFail = totalScore >= result.pass_score_pct ? 'pass' : 'fail'

  await db.query(
    `UPDATE results SET
       subjective_score=$1, total_score=$2, max_score=$3, pass_fail=$4,
       is_finalised=true, finalised_at=NOW(), finalised_by=$5
     WHERE id=$6`,
    [subjectiveScore, totalScore, totalMaxMarks, passFail, adminId, params.id]
  )

  logAudit({
    user_id: adminId,
    user_type: 'admin',
    action: 'result_finalised',
    resource: 'results',
    resource_id: params.id,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
  })

  return NextResponse.json({ finalised: true, pass_fail: passFail, total_score: totalScore, max_score: totalMaxMarks })
}
