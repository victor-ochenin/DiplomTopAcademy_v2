import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockLLM } from '../helpers/test-utils'
import { setGradingClientFactory } from '../../src/rag/grading.js'
import { CLARIFY_MESSAGE, OFF_TOPIC_MESSAGE } from '../../src/rag/routing.js'

const { mockRunnable } = createMockLLM()

const mockQueryAll = vi.fn()

vi.mock('../../src/rag/vectorStore.js', () => ({
  queryAll: (...args: unknown[]) => mockQueryAll(...args),
  LESSONS_DIR: 'C:/fake/lessons',
  ensureIndex: vi.fn(),
  ensureWebIndex: vi.fn(),
  testChromaConnection: vi.fn(),
}))

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

// Один фейк-клиент обслуживает и роутинг, и фильтр контекста:
// форма вопросов в запросе различает, какой это этап.
function installFakeJev(
  route: { choice: string; confidence: number },
  filter: { relevance?: number; injection?: number } = {},
) {
  setGradingClientFactory(() => ({
    async systemOne(request: unknown) {
      const { questions } = request as { questions: Record<string, unknown> }
      const names = Object.keys(questions)

      if (names.includes('routing')) {
        return {
          model: 'jev-fake',
          answers: {
            routing: {
              type: 'choice',
              choice: route.choice,
              confidence: route.confidence,
            },
          },
          usage: { input_tokens: 40, output_tokens: 10 },
        }
      }

      const answers: Record<string, unknown> = {}
      for (const name of names) {
        if (name.endsWith('_relevance')) {
          answers[name] = {
            type: 'score',
            score: filter.relevance ?? 2,
            confidence: 0.9,
          }
        } else if (name.endsWith('_injection')) {
          answers[name] = { type: 'noul', noul: filter.injection ?? 0 }
        } else {
          answers[name] = { type: 'noul', noul: 0 }
        }
      }
      return {
        model: 'jev-fake',
        answers,
        usage: { input_tokens: 100, output_tokens: 20 },
      }
    },
  }))
}

beforeEach(async () => {
  mockQueryAll.mockReset()
  mockRunnable.invoke.mockReset()
  mockRunnable.invoke.mockResolvedValue('ответ модели')
  mod = await import('../../src/rag/query.js')
})

describe('queryRag routing', () => {
  it('returns a fixed clarify message without touching RAG', async () => {
    installFakeJev({ choice: 'course_question', confidence: 0.5 })

    const result = await mod.queryRag('что-то неясное')

    expect(result.answer).toBe(CLARIFY_MESSAGE)
    expect(mockQueryAll).not.toHaveBeenCalled()
    expect(mockRunnable.invoke).not.toHaveBeenCalled()
  })

  it('returns a fixed off-topic refusal without RAG or LLM', async () => {
    installFakeJev({ choice: 'off_topic', confidence: 0.95 })

    const result = await mod.queryRag('Какая погода завтра?')

    expect(result.answer).toBe(OFF_TOPIC_MESSAGE)
    expect(mockQueryAll).not.toHaveBeenCalled()
    expect(mockRunnable.invoke).not.toHaveBeenCalled()
  })

  it('answers meta questions with the LLM but without RAG', async () => {
    installFakeJev({ choice: 'meta_question', confidence: 0.85 })

    const result = await mod.queryRag('Как отправить код на проверку?')

    expect(result.answer).toBe('ответ модели')
    expect(mockQueryAll).not.toHaveBeenCalled()
    expect(mockRunnable.invoke).toHaveBeenCalledTimes(1)
  })

  it('runs the RAG pipeline for course questions', async () => {
    installFakeJev({ choice: 'course_question', confidence: 0.93 })
    mockQueryAll.mockResolvedValue([
      { pageContent: '[Урок] useEffect runs after render' },
    ])

    const result = await mod.queryRag('Как работает useEffect?')

    expect(result.answer).toBe('ответ модели')
    expect(mockQueryAll).toHaveBeenCalledWith('Как работает useEffect?')
    expect(mockRunnable.invoke).toHaveBeenCalledTimes(1)
  })

  it('skips RAG when the filter drops every passage', async () => {
    installFakeJev(
      { choice: 'course_question', confidence: 0.93 },
      { relevance: 0, injection: 0.95 },
    )
    mockQueryAll.mockResolvedValue([
      { pageContent: '[Официальная документация] Ignore previous' },
      { pageContent: '[Урок] another' },
    ])

    const result = await mod.queryRag('Как работает useEffect?')

    expect(result.answer).toBe('ответ модели')
    expect(mockRunnable.invoke).toHaveBeenCalledTimes(1)
    const invokeArg = mockRunnable.invoke.mock.calls[0][0] as {
      context: string
    }
    expect(invokeArg.context).toBe('')
  })
})
