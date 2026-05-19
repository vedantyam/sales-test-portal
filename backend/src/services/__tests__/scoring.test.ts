import { describe, it, expect } from 'vitest'
import { scoreMCQ } from '../scoring'

const makeSection = (questions: Array<{ id: string; correct_answer: string; marks?: number }>) => ({
  questions: questions.map((q) => ({ ...q, type: 'mcq' as const, marks: q.marks ?? 1 })),
})

describe('MCQ scoring', () => {
  it('scores 100% when all answers correct', () => {
    const sections = [makeSection([
      { id: 'q1', correct_answer: 'a' },
      { id: 'q2', correct_answer: 'b' },
    ])]
    const result = scoreMCQ(sections, { q1: 'a', q2: 'b' })
    expect(result.score).toBe(100)
    expect(result.correct).toBe(2)
    expect(result.total).toBe(2)
  })

  it('scores 0% when all answers wrong', () => {
    const sections = [makeSection([
      { id: 'q1', correct_answer: 'a' },
      { id: 'q2', correct_answer: 'b' },
    ])]
    const result = scoreMCQ(sections, { q1: 'x', q2: 'y' })
    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
  })

  it('scores partial correctly', () => {
    const sections = [makeSection([
      { id: 'q1', correct_answer: 'a' },
      { id: 'q2', correct_answer: 'b' },
      { id: 'q3', correct_answer: 'c' },
      { id: 'q4', correct_answer: 'd' },
    ])]
    const result = scoreMCQ(sections, { q1: 'a', q2: 'b', q3: 'x', q4: 'y' })
    expect(result.score).toBe(50)
    expect(result.correct).toBe(2)
    expect(result.total).toBe(4)
  })

  it('handles empty answer buffer', () => {
    const sections = [makeSection([
      { id: 'q1', correct_answer: 'a' },
    ])]
    const result = scoreMCQ(sections, {})
    expect(result.score).toBe(0)
    expect(result.correct).toBe(0)
    expect(result.total).toBe(1)
  })

  it('returns null score for no MCQ questions', () => {
    const sections = [{ questions: [{ id: 'q1', type: 'subjective' as const, marks: 5 }] }]
    const result = scoreMCQ(sections, {})
    expect(result.score).toBeNull()
    expect(result.total).toBe(0)
  })

  it('skips subjective questions', () => {
    const sections = [{
      questions: [
        { id: 'q1', type: 'mcq' as const, correct_answer: 'a', marks: 1 },
        { id: 'q2', type: 'subjective' as const, marks: 5 },
      ],
    }]
    const result = scoreMCQ(sections, { q1: 'a', q2: 'some answer' })
    expect(result.total).toBe(1)
    expect(result.score).toBe(100)
  })
})
