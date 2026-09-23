import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  gradeSubmission,
  buildGradingClient,
  PASS_THRESHOLD,
  CRITERION_THRESHOLD,
  BLOCKING_THRESHOLD,
  BLOCKING_UNCERTAIN_LOW,
  type GradingTask,
  type TypeSafeLikeClient,
} from '../../src/rag/grading.js'

type Noul = { type: 'noul'; noul: number }
type Score = { type: 'score'; score: number; confidence: number }

// Управляемый фейк TypeSafe-клиента: отдаёт заранее заданные ответы и пишет
// последний запрос, чтобы проверить форму state/questions.
function createFakeClient(answers: Record<string, Noul | Score>) {
  const calls: unknown[] = []
  const client: TypeSafeLikeClient = {
    async systemOne(request: unknown) {
      calls.push(request)
      return {
        model: 'jev-fake',
        answers,
        usage: { input_tokens: 100, output_tokens: 20 },
      }
    },
  }
  return { client, calls }
}

function noulAnswer(value: number): Noul {
  return { type: 'noul', noul: value }
}

function scoreAnswer(score: number, confidence = 0.9): Score {
  return { type: 'score', score, confidence }
}

const task: GradingTask = {
  id: 'task1',
  kind: 'file',
  question: 'Write a component that renders a greeting.',
  criteria: ['Uses JSX', 'Is a valid component'],
}

// coverage = (criterion_0 + criterion_1) / 2
function answersFor(
  criterionValues: number[],
  violation = 0,
  overall = 3,
): Record<string, Noul | Score> {
  return {
    ...Object.fromEntries(
      criterionValues.map((v, i) => [`criterion_${i}`, noulAnswer(v)]),
    ),
    has_blocking_violation: noulAnswer(violation),
    overall: scoreAnswer(overall),
  }
}

const originalApiKey = process.env.TYPESAFE_API_KEY

beforeEach(() => {
  process.env.TYPESAFE_API_KEY = 'test-key'
})

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.TYPESAFE_API_KEY
  else process.env.TYPESAFE_API_KEY = originalApiKey
})

describe('gradeSubmission', () => {
  it('passes when coverage meets the threshold and no blocking violation', async () => {
    const { client } = createFakeClient(answersFor([1, 1], 0.05, 3))
    const verdict = await gradeSubmission(task, 'code', client)

    expect(verdict.passed).toBe(true)
    expect(verdict.coverage).toBe(1)
    expect(verdict.blocking).toBe(false)
    expect(verdict.failedCriteria).toEqual([])
    expect(verdict.needsReview).toBe(false)
    expect(verdict.overall).toBe(3)
    expect(verdict.confidence).toBe(0.9)
    expect(verdict.usage).toEqual({ input_tokens: 100, output_tokens: 20 })
  })

  it('fails just below the coverage threshold (0.78 vs 0.80)', async () => {
    // coverage = 0.79 (ниже порога) и ровно 0.80 (на пороге)
    const justBelow = answersFor(
      [PASS_THRESHOLD - 0.02, PASS_THRESHOLD - 0.02],
      0.05,
      3,
    )
    const atThreshold = answersFor([PASS_THRESHOLD, PASS_THRESHOLD], 0.05, 3)

    const below = await gradeSubmission(
      task,
      'code',
      createFakeClient(justBelow).client,
    )
    const at = await gradeSubmission(
      task,
      'code',
      createFakeClient(atThreshold).client,
    )

    expect(below.coverage).toBeCloseTo(0.78, 3)
    expect(below.passed).toBe(false)
    expect(at.coverage).toBeCloseTo(0.8, 3)
    expect(at.passed).toBe(true)
  })

  it('reports failed criteria below the criterion threshold', async () => {
    const { client } = createFakeClient(
      answersFor([0.9, CRITERION_THRESHOLD - 0.01], 0.05, 3),
    )
    const verdict = await gradeSubmission(task, 'code', client)

    expect(verdict.failedCriteria).toEqual(['Is a valid component'])
    expect(verdict.passed).toBe(false)
  })

  it('treats a high violation probability as blocking', async () => {
    const { client } = createFakeClient(
      answersFor([1, 1], BLOCKING_THRESHOLD, 3),
    )
    const verdict = await gradeSubmission(task, 'code', client)

    expect(verdict.blocking).toBe(true)
    expect(verdict.passed).toBe(false)
    // На границе порога нарушения это не «серая зона» — решение уже принято.
    expect(verdict.needsReview).toBe(false)
  })

  it('flags needsReview in the uncertainty band', async () => {
    const mid = (BLOCKING_UNCERTAIN_LOW + BLOCKING_THRESHOLD) / 2
    const { client } = createFakeClient(answersFor([1, 1], mid, 3))
    const verdict = await gradeSubmission(task, 'code', client)

    expect(verdict.needsReview).toBe(true)
    expect(verdict.blocking).toBe(false)
    expect(verdict.passed).toBe(true)
  })

  it('fails when the overall score is too low even with full coverage', async () => {
    const { client } = createFakeClient(answersFor([1, 1], 0.05, 1))
    const verdict = await gradeSubmission(task, 'code', client)

    expect(verdict.coverage).toBe(1)
    expect(verdict.passed).toBe(false)
  })

  it('sends one question per criterion plus violation and overall', async () => {
    const { client, calls } = createFakeClient(answersFor([1, 1], 0.05, 3))
    await gradeSubmission(task, 'code', client)

    const request = calls[0] as {
      state: { task: { kind: string; criteria: string[] } }
      questions: Record<string, { type: string }>
    }

    expect(Object.keys(request.questions).sort()).toEqual([
      'criterion_0',
      'criterion_1',
      'has_blocking_violation',
      'overall',
    ])
    expect(request.questions.criterion_0.type).toBe('noul')
    expect(request.questions.overall.type).toBe('score')
    expect(request.state.task.criteria).toEqual(task.criteria)
  })

  it('includes the assignment question in the grading state', async () => {
    const { client, calls } = createFakeClient(answersFor([1, 1], 0.05, 3))
    await gradeSubmission(task, 'code', client)

    const request = calls[0] as {
      state: { task: { question: string }; submission: { code: string } }
    }

    // Без формулировки задания критерии вида «работает корректно» не оценить.
    expect(request.state.task.question).toBe(task.question)
    expect(request.state.submission.code).toBe('code')
  })

  it('throws on malformed answers instead of guessing', async () => {
    const { client } = createFakeClient({
      has_blocking_violation: noulAnswer(0),
      overall: scoreAnswer(3),
      // criterion_0/criterion_1 отсутствуют
    } as Record<string, Noul | Score>)

    await expect(gradeSubmission(task, 'code', client)).rejects.toThrow(
      /unexpected answer for question "criterion_0"/,
    )
  })
})
