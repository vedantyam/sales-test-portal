interface Question {
  id: string
  type: 'mcq' | 'subjective'
  marks: number
  correct_answer?: string
}

interface Section {
  questions: Question[]
}

export interface MCQScoreResult {
  score: number | null
  correct: number
  total: number
}

export function scoreMCQ(sections: Section[], answerBuffer: Record<string, string>): MCQScoreResult {
  let correct = 0
  let total = 0

  for (const section of sections) {
    for (const q of section.questions) {
      if (q.type !== 'mcq') continue
      total++
      if (answerBuffer[q.id] !== undefined && answerBuffer[q.id] === q.correct_answer) {
        correct++
      }
    }
  }

  return {
    score: total > 0 ? Math.round((correct / total) * 100) : null,
    correct,
    total,
  }
}
