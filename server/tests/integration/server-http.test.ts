import { vi, describe, it, expect, beforeAll } from 'vitest'

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

  it('returns 200 with result for valid request', async () => {
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'console.log' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ passed: true, feedback: 'ok' })
    expect(mockCheckCode).toHaveBeenCalledWith('t1', 'l1', 'console.log', undefined)
  })

  it('passes kind to checkCode', async () => {
    const res = await app.request('/api/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 't1', lessonId: 'l1', code: 'x', kind: 'project' }),
    })
    expect(res.status).toBe(200)
    expect(mockCheckCode).toHaveBeenCalledWith('t1', 'l1', 'x', 'project')
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
})
