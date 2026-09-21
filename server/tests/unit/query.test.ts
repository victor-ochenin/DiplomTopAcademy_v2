import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockFS, createMockLLM } from '../helpers/test-utils'
import { setGradingClientFactory } from '../../src/rag/grading.js'

const { mockFS, addFile, addDir, mockImpl } = createMockFS()
const { mockRunnable } = createMockLLM()

vi.mock('node:fs', () => mockImpl)

vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: { fromMessages: vi.fn().mockReturnValue(mockRunnable) },
}))

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(function () {
    return {}
  }),
}))
vi.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: vi.fn().mockImplementation(function () {
    return {}
  }),
}))

let mod: typeof import('../../src/rag/query.js')

// Ответы jev подменяются фейковым клиентом: реальная сеть и ключ в тестах не нужны.
// Форму вердикта задаём через значения критериев, порог нарушения и общий Score.
function installFakeGrading(
  criterionValues: number[],
  violation = 0,
  overall = 3,
) {
  const answers: Record<string, unknown> = {
    ...Object.fromEntries(
      criterionValues.map((value, index) => [
        `criterion_${index}`,
        { type: 'noul', noul: value },
      ]),
    ),
    has_blocking_violation: { type: 'noul', noul: violation },
    overall: { type: 'score', score: overall, confidence: 0.9 },
  }

  setGradingClientFactory(() => ({
    async systemOne() {
      return {
        model: 'jev-fake',
        answers,
        usage: { input_tokens: 10, output_tokens: 5 },
      }
    },
  }))
}

beforeEach(async () => {
  mockFS.clear()
  mockRunnable.invoke.mockReset()
  mod = await import('../../src/rag/query.js')
})

function setupLesson(lessonId = 'what-is-react') {
  const dir = mod.LESSONS_DIR
  addDir(dir)
  addDir(dir + '/react-basics')
  addDir(dir + '/react-basics/' + lessonId)
  addFile(
    dir + '/react-basics/' + lessonId + '/lesson.json',
    JSON.stringify({
      id: lessonId,
      tasks: [
        {
          id: 'task1',
          type: 'coding',
          kind: 'file',
          question: 'Write a component',
          criteria: ['Uses JSX', 'Is a valid component'],
          expectedFiles: ['App.jsx'],
        },
      ],
    }),
  )
}

describe('checkCode', () => {
  it('returns { passed, feedback } when all criteria are met', async () => {
    setupLesson('what-is-react')
    installFakeGrading([1, 1])
    const result = await mod.checkCode(
      'task1',
      'what-is-react',
      'function App() {}',
    )
    expect(result.passed).toBe(true)
    expect(result.feedback).toContain('Все критерии задания выполнены')
  })

  it('lists failed criteria in the feedback', async () => {
    setupLesson('what-is-react')
    // критерий 0 выполнен, критерий 1 — нет
    installFakeGrading([0.9, 0.1])
    const result = await mod.checkCode('task1', 'what-is-react', 'code')

    expect(result.passed).toBe(false)
    expect(result.feedback).toContain('Is a valid component')
    expect(result.feedback).not.toContain('Uses JSX')
  })

  it('reports a blocking violation in the feedback', async () => {
    setupLesson('what-is-react')
    installFakeGrading([1, 1], 0.95)
    const result = await mod.checkCode('task1', 'what-is-react', 'code')

    expect(result.passed).toBe(false)
    expect(result.feedback).toContain('блокирующее нарушение')
  })

  it('fails when coverage is below the threshold', async () => {
    setupLesson('what-is-react')
    installFakeGrading([0.2, 0.3])
    const result = await mod.checkCode('task1', 'what-is-react', 'code')

    expect(result.passed).toBe(false)
  })

  it('fails when the overall score is too low', async () => {
    setupLesson('what-is-react')
    installFakeGrading([1, 1], 0, 1)
    const result = await mod.checkCode('task1', 'what-is-react', 'code')

    expect(result.passed).toBe(false)
  })

  it('sends criteria and code as state to jev', async () => {
    setupLesson('what-is-react')
    let captured: unknown
    setGradingClientFactory(() => ({
      async systemOne(request: unknown) {
        captured = request
        return {
          model: 'jev-fake',
          answers: {
            criterion_0: { type: 'noul', noul: 1 },
            criterion_1: { type: 'noul', noul: 1 },
            has_blocking_violation: { type: 'noul', noul: 0 },
            overall: { type: 'score', score: 3, confidence: 0.9 },
          },
          usage: { input_tokens: 10, output_tokens: 5 },
        }
      },
    }))

    await mod.checkCode('task1', 'what-is-react', 'my code')

    const request = captured as {
      state: {
        submission: { code: string }
        task: { criteria: string[]; question: string }
      }
      questions: Record<string, unknown>
    }
    expect(request.state.submission.code).toBe('my code')
    expect(request.state.task.criteria).toEqual([
      'Uses JSX',
      'Is a valid component',
    ])
    // Формулировка задания обязана дойти до модели: без неё критерии
    // вида «работает корректно» не оценить.
    expect(request.state.task.question).toBe('Write a component')
    expect(Object.keys(request.questions)).toContain('criterion_0')
    expect(Object.keys(request.questions)).toContain('has_blocking_violation')
    expect(Object.keys(request.questions)).toContain('overall')
  })

  it('throws when lesson is not found', async () => {
    addDir(mod.LESSONS_DIR)
    await expect(mod.checkCode('task1', 'nonexistent', 'code')).rejects.toThrow(
      'Lesson nonexistent not found',
    )
  })

  it('throws when task is not found', async () => {
    setupLesson('what-is-react')
    await expect(
      mod.checkCode('task99', 'what-is-react', 'code'),
    ).rejects.toThrow('Task task99 not found')
  })
})
