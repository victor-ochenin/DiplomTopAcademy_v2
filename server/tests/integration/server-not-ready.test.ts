import { vi, describe, it, expect, beforeAll } from 'vitest'
import { z } from 'zod'

// мокаем serve() чтобы сервер не стартовал на порту
vi.mock('@hono/node-server', () => ({ serve: vi.fn() }))

let app: any

beforeAll(async () => {
  const mod = await import('../../src/index.js')
  app = mod.app
})

// initRag замокан на reject → ready остаётся false → сервер вернёт 503
vi.mock('../../src/rag/query.js', () => ({
  initRag: vi.fn().mockRejectedValue(new Error('mock fail')),
  queryRag: vi.fn(),
  checkCode: vi.fn(),
  HistoryMessageSchema: z.object({ role: z.string(), text: z.string() }),
}))

describe('POST /api/query — server not ready', () => {
  it('returns 503 when RAG is not ready', async () => {
    const res = await app.request('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'test' }),
    })
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('RAG not ready')
  })
})
