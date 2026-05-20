import * as XLSX from 'xlsx'
import { randomUUID } from 'crypto'

export interface ParsedQuestion {
  id: string
  type: 'mcq' | 'subjective'
  text: string
  options?: { id: string; text: string }[]
  correct_answer?: string
  marks: number
  expected_answer?: string
  order: number
}

export interface ParsedSection {
  id: string
  name: string
  order: number
  questions: ParsedQuestion[]
}

export function parseExamFile(buffer: Buffer): { sections: ParsedSection[]; errors: string[] } {
  const errors: string[] = []
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (rows.length === 0) {
    return { sections: [], errors: ['File is empty or has no data rows'] }
  }

  const sectionMap = new Map<string, ParsedQuestion[]>()
  const sectionOrder: string[] = []

  rows.forEach((row, i) => {
    const rowNum = i + 2

    const sectionName = String(row['Section'] || '').trim()
    const type = String(row['Type'] || '').trim().toLowerCase()
    const questionText = String(row['Question'] || '').trim()
    const marks = Number(row['Marks']) || (type === 'mcq' ? 1 : 2)
    const expectedAnswer = String(row['Expected Answer'] || '').trim()

    if (!sectionName) { errors.push(`Row ${rowNum}: Section is required`); return }
    if (!['mcq', 'subjective'].includes(type)) { errors.push(`Row ${rowNum}: Type must be MCQ or Subjective`); return }
    if (!questionText) { errors.push(`Row ${rowNum}: Question text is required`); return }

    if (!sectionMap.has(sectionName)) {
      sectionMap.set(sectionName, [])
      sectionOrder.push(sectionName)
    }

    const questions = sectionMap.get(sectionName)!
    const questionIndex = questions.length

    if (type === 'mcq') {
      const optA = String(row['Option A'] || '').trim()
      const optB = String(row['Option B'] || '').trim()
      const optC = String(row['Option C'] || '').trim()
      const optD = String(row['Option D'] || '').trim()
      const correct = String(row['Correct'] || '').trim().toUpperCase()

      if (!optA || !optB) { errors.push(`Row ${rowNum}: MCQ must have at least Option A and Option B`); return }
      if (!['A', 'B', 'C', 'D'].includes(correct)) { errors.push(`Row ${rowNum}: Correct must be A, B, C, or D`); return }

      const options = [
        { id: 'a', text: optA },
        { id: 'b', text: optB },
        ...(optC ? [{ id: 'c', text: optC }] : []),
        ...(optD ? [{ id: 'd', text: optD }] : []),
      ]

      questions.push({
        id: randomUUID(),
        type: 'mcq',
        text: questionText,
        options,
        correct_answer: correct.toLowerCase(),
        marks,
        order: questionIndex + 1,
      })
    } else {
      questions.push({
        id: randomUUID(),
        type: 'subjective',
        text: questionText,
        marks,
        expected_answer: expectedAnswer || undefined,
        order: questionIndex + 1,
      })
    }
  })

  const sections: ParsedSection[] = sectionOrder.map((name, i) => ({
    id: randomUUID(),
    name,
    order: i + 1,
    questions: sectionMap.get(name) || [],
  }))

  return { sections, errors }
}

export interface ImportedScore {
  employee_id: string
  question_text: string
  marks_awarded: number
  row_number: number
}

export interface ImportScoreResult {
  scores: ImportedScore[]
  errors: string[]
  skipped: number
}

export function parseScoreFile(buffer: Buffer): ImportScoreResult {
  const errors: string[] = []
  const scores: ImportedScore[] = []
  let skipped = 0

  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames.includes('Answers')
    ? 'Answers'
    : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  rows.forEach((row, i) => {
    const rowNum = i + 2

    const employeeId = String(row['Employee ID'] || '').trim()
    const type = String(row['Type'] || '').trim()
    const questionText = String(row['Question'] || '').trim()
    const marksRaw = row['Marks Awarded']

    if (type === 'MCQ' || type === 'MCQ Reasoning' || !employeeId || !questionText) {
      skipped++
      return
    }

    if (type !== 'Subjective') {
      skipped++
      return
    }

    if (!/^[0-9a-f-]{36}$/.test(employeeId)) {
      errors.push(`Row ${rowNum}: Invalid Employee ID "${employeeId}"`)
      return
    }

    if (marksRaw === '' || marksRaw === null || marksRaw === undefined) {
      errors.push(`Row ${rowNum}: Marks Awarded is empty for ${questionText} — employee ${employeeId}`)
      return
    }

    const marks = Number(marksRaw)
    if (isNaN(marks) || marks < 0) {
      errors.push(`Row ${rowNum}: Marks Awarded must be a non-negative number, got "${marksRaw}"`)
      return
    }

    scores.push({ employee_id: employeeId, question_text: questionText, marks_awarded: marks, row_number: rowNum })
  })

  return { scores, errors, skipped }
}
