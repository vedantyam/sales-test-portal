export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { parseExamFile } from '@/lib/parseExam'

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth.error) return auth.error

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    return NextResponse.json({ error: 'File must be .xlsx or .xls' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { sections, errors } = parseExamFile(buffer)

  if (errors.length > 0 && sections.length === 0) {
    return NextResponse.json({ error: 'File has errors', errors }, { status: 400 })
  }

  const allQuestions = sections.flatMap(s => s.questions)
  const totalQuestions = allQuestions.length

  return NextResponse.json({
    sections,
    errors,
    summary: {
      section_count: sections.length,
      question_count: totalQuestions,
      mcq_count: allQuestions.filter(q => q.type === 'mcq').length,
      subjective_count: allQuestions.filter(q => q.type === 'subjective').length,
    },
  })
}
