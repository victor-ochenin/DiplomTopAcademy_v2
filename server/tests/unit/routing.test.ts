import { describe, it, expect } from 'vitest'
import {
  routeQuestion,
  ROUTING_QUESTION_ID,
  ROUTING_CONFIDENCE_MIN,
  type TypeSafeLikeClient,
} from '../../src/rag/routing.js'

type Choice = { type: 'choice'; choice: string; confidence: number }

function createFakeClient(choice: string, confidence: number) {
  const calls: unknown[] = []
  const client: TypeSafeLikeClient = {
    async systemOne(request: unknown) {
      calls.push(request)
      return {
        model: 'jev-fake',
        answers: {
          [ROUTING_QUESTION_ID]: {
            type: 'choice',
            choice,
            confidence,
          } satisfies Choice,
        },
        usage: { input_tokens: 40, output_tokens: 10 },
      }
    },
  }
  return { client, calls }
}

describe('routeQuestion', () => {
  it('routes a confident course question to RAG', async () => {
    const { client } = createFakeClient('course_question', 0.92)
    const decision = await routeQuestion('Как работает useEffect?', client)

    expect(decision.kind).toBe('course_question')
    expect(decision.confidence).toBe(0.92)
    expect(decision.usage).toEqual({ input_tokens: 40, output_tokens: 10 })
  })

  it('routes a confident meta question without RAG', async () => {
    const { client } = createFakeClient('meta_question', 0.8)
    const decision = await routeQuestion('Как проверяется код?', client)

    expect(decision.kind).toBe('meta_question')
  })

  it('routes a confident off-topic question to a fixed refusal', async () => {
    const { client } = createFakeClient('off_topic', 0.95)
    const decision = await routeQuestion('Какая погода завтра?', client)

    expect(decision.kind).toBe('off_topic')
  })

  it('asks for clarification below the confidence floor', async () => {
    const { client } = createFakeClient(
      'course_question',
      ROUTING_CONFIDENCE_MIN - 0.01,
    )
    const decision = await routeQuestion('что-то', client)

    expect(decision.kind).toBe('clarify')
    expect(decision.selected).toBe('course_question')
  })

  it('acts at exactly the confidence floor', async () => {
    const { client } = createFakeClient('off_topic', ROUTING_CONFIDENCE_MIN)
    const decision = await routeQuestion('что-то', client)

    expect(decision.kind).toBe('off_topic')
  })

  it('clarifies on an unknown label even with high confidence', async () => {
    const { client } = createFakeClient('something_else', 0.99)
    const decision = await routeQuestion('что-то', client)

    expect(decision.kind).toBe('clarify')
    expect(decision.selected).toBe('something_else')
  })

  it('sends one choice question with the three route labels', async () => {
    const { client, calls } = createFakeClient('course_question', 0.9)
    await routeQuestion('Как работает useState?', client)

    expect(calls).toHaveLength(1)
    const request = calls[0] as {
      state: { question: string }
      questions: Record<
        string,
        { type: string; criteria: Record<string, string> }
      >
    }
    expect(request.state.question).toBe('Как работает useState?')
    expect(request.questions[ROUTING_QUESTION_ID].type).toBe('choice')
    expect(
      Object.keys(request.questions[ROUTING_QUESTION_ID].criteria).sort(),
    ).toEqual(['course_question', 'meta_question', 'off_topic'])
  })

  it('throws on malformed answers instead of guessing', async () => {
    const client: TypeSafeLikeClient = {
      async systemOne() {
        return {
          model: 'jev-fake',
          answers: { [ROUTING_QUESTION_ID]: { type: 'noul', noul: 0.5 } },
          usage: { input_tokens: 1, output_tokens: 1 },
        }
      },
    }

    await expect(routeQuestion('q', client)).rejects.toThrow(
      /unexpected answer for question "routing"/,
    )
  })
})
