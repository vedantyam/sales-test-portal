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
  const partScores: Record<string, Array<{ part_id: string; score: number }>> = result.part_scores || {}

  const { rows: sessionRows } = await db.query(
    `SELECT answer_buffer FROM test_sessions WHERE assignment_id = $1`,
    [result.assignment_id]
  )
  const answerBuffer: Record<string, any> = sessionRows[0]?.answer_buffer || {}

  let totalMaxMarks = 0
  let totalEarned = 0
  let subjectiveEarned = 0
  let subjectiveMax = 0
  let subjectiveCount = 0

  for (const section of sections) {
    for (const q of section.questions) {
      const qMarks = q.marks || 0
      totalMaxMarks += qMarks

      if (q.type === 'mcq') {
        const raw = answerBuffer[q.id]
        const ans = typeof raw === 'string' ? raw
          : (raw && typeof raw === 'object' ? (raw.answer ?? null) : null)
        if (ans === q.correct_answer) totalEarned += qMarks
      } else if (q.type === 'subjective') {
        const earned = Number(subjectiveScores[q.id] || 0)
        totalEarned += earned
        subjectiveEarned += earned
        subjectiveMax += qMarks
        subjectiveCount++
      } else if (q.type === 'parts') {
        const qPartScores = partScores[q.id] || []
        const earned = qPartScores.reduce(
          (s: number, ps: { part_id: string; score: number }) => s + Number(ps.score || 0), 0
        )
        totalEarned += earned
        subjectiveCount++
      }
    }
  }

  const subjectiveScore = subjectiveMax > 0
    ? Math.round((subjectiveEarned / subjectiveMax) * 100)
    : null

  const passFail = totalMaxMarks > 0
    ? ((totalEarned / totalMaxMarks) * 100 >= result.pass_score_pct ? 'pass' : 'fail')
    : 'fail'

  await db.query(
    `UPDATE results SET
       subjective_score=$1, total_score=$2, max_score=$3, pass_fail=$4,
       is_finalised=true, finalised_at=NOW(), finalised_by=$5
     WHERE id=$6`,
    [subjectiveScore, totalEarned, totalMaxMarks, passFail, adminId, params.id]
  )

  logAudit({
    user_id: adminId,
    user_type: 'admin',
    action: 'result_finalised',
    resource: 'results',
    resource_id: params.id,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
  })

  return NextResponse.json({ finalised: true, pass_fail: passFail, total_score: totalEarned, max_score: totalMaxMarks })
}
