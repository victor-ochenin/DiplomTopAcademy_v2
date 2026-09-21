import { vi, describe, it, expect, beforeAll } from 'vitest'
import { z } from 'zod'

// мокаем serve() чтобы Hono-сервер не стартовал на реальном порту
vi.mock('@hono/node-server', () => ({ serve: vi.fn() }))

// мокаем query.ts: initRag сразу резолвится → ready = true
// queryRag / checkCode — динамические заглушки, зададим поведение в beforeAll
const mockQueryRag = vi.fn()
const mockCheckCode = vi.fn()

vi.mock('../../src/rag/query.js', () => ({
  initRag: vi.fn().mockResolvedValue(undefined),
  queryRag: mockQueryRag,
  checkCode: mockCheckCode,
  HistoryMessageSchema: z.object({ role: z.string(), text: z.string() }),
}))

let app: any // Hono-приложение, будет импортировано после установки моков

beforeAll(async () => {
  // динамический импорт — модуль загружается с уже подставленными моками
  const mod = await import('../../src/index.js')
  app = mod.app
  // queryRag возвращает предсказуемый ответ — без вызова OpenRouter
  mockQueryRag.mockResolvedValue({
    answer: 'useState — это хук для состояния',
  })
  // checkCode возвращает предсказуемый ответ
  mockCheckCode.mockResolvedValue({ passed: true, feedback: 'ok' })
})

describe('POST /api/query', () => {
  // app.request() — Hono симулирует HTTP-запрос без реального сервера
  it('returns 200 with answer for valid request', async () => {
    const res = await app.request('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Что такое useState?' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.answer).toBe('useState — это хук для состояния')
  })

  it('returns 400 for empty body', async () => {
    const res = await app.request('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('question')
  })

  it('returns 400 when question is not a string', async () => {
    const res = await app.request('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 123 }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('question')
  })

  it('returns 400 when question is empty string', async () => {
    const res = await app.request('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/check-code', () => {
  it('returns 400 for empty body', async () => {
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('taskId, lessonId and code are required')
  })

  it('returns 400 when code is missing', async () => {
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('taskId, lessonId and code are required')
  })

  it('returns 400 when fields are empty strings', async () => {
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: '', lessonId: '', code: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('taskId, lessonId and code are required')
  })

  it('returns 200 with result for valid request', async () => {
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 't1',
        lessonId: 'l1',
        code: 'console.log',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ passed: true, feedback: 'ok' })
    expect(mockCheckCode).toHaveBeenCalledWith('t1', 'l1', 'console.log')
  })

  it('returns 500 when checkCode throws', async () => {
    mockCheckCode.mockRejectedValueOnce(new Error('boom'))
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'x' }),
    })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to check code')
  })

  // Транспортные сбои TypeSafe (DNS/TLS/таймаут) не наследуют APIError,
  // поэтому должны проверяться отдельно и давать 503, а не общий 500.
  it('returns 503 for a TypeSafe transport error', async () => {
    const { APIConnectionError, APITimeoutError } =
      await import('@typesafe-ai/sdk')
    mockCheckCode.mockRejectedValueOnce(
      new APIConnectionError('connect ECONNREFUSED'),
    )
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'x' }),
    })
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('Grading service unavailable')

    // APITimeoutError — подкласс APIConnectionError, обрабатывается так же.
    mockCheckCode.mockRejectedValueOnce(new APITimeoutError(10_000))
    const timeoutRes = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'x' }),
    })
    expect(timeoutRes.status).toBe(503)
  })

  it('returns 503 when TypeSafe rate-limits the request', async () => {
    const { RateLimitError } = await import('@typesafe-ai/sdk')
    mockCheckCode.mockRejectedValueOnce(
      new RateLimitError(429, {}, new Headers()),
    )
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'x' }),
    })
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('Grading service busy')
  })

  it('returns 503 when the grading service returns a 5xx', async () => {
    const { InternalServerError } = await import('@typesafe-ai/sdk')
    mockCheckCode.mockRejectedValueOnce(
      new InternalServerError(500, {}, new Headers()),
    )
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'x' }),
    })
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('Grading service unavailable')
  })

  it('returns 502 when the grading service rejects the request', async () => {
    const { UnprocessableEntityError } = await import('@typesafe-ai/sdk')
    mockCheckCode.mockRejectedValueOnce(
      new UnprocessableEntityError(422, {}, new Headers()),
    )
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'x' }),
    })
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe(
      'Grading service rejected the request',
    )
  })
})
