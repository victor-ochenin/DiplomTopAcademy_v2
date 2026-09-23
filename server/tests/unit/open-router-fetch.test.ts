import { vi, describe, it, expect, afterEach } from 'vitest'
import { openRouterFetch } from '../../src/rag/query.js'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function mockFetchResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers,
    }),
  ) as unknown as typeof fetch
}

describe('openRouterFetch', () => {
  it('rewrites 200 without choices into 503 so the SDK retries', async () => {
    // Так OpenRouter отвечает при перегрузке провайдера: статус 200,
    // в теле error, choices отсутствует — LangChain иначе падает с TypeError.
    mockFetchResponse(200, {
      id: 'gen-1',
      error: {
        message: 'Upstream error from Nvidia: Service temporarily overloaded',
        code: 503,
      },
    })

    const res = await openRouterFetch('https://openrouter.ai/api/v1/chat')

    expect(res.status).toBe(503)
    const body = (await res.json()) as { error?: { code?: number } }
    expect(body.error?.code).toBe(503)
  })

  it('rewrites 200 with empty choices into 503', async () => {
    mockFetchResponse(200, { id: 'gen-2', choices: [] })

    const res = await openRouterFetch('https://openrouter.ai/api/v1/chat')

    expect(res.status).toBe(503)
  })

  it('passes a successful 200 with choices through unchanged', async () => {
    mockFetchResponse(200, {
      id: 'gen-3',
      choices: [{ message: { role: 'assistant', content: 'ок' } }],
    })

    const res = await openRouterFetch('https://openrouter.ai/api/v1/chat')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { choices: unknown[] }
    expect(body.choices).toHaveLength(1)
  })

  it('does not touch non-200 responses', async () => {
    mockFetchResponse(429, { error: { message: 'rate limited' } })

    const res = await openRouterFetch('https://openrouter.ai/api/v1/chat')

    expect(res.status).toBe(429)
  })

  it('passes non-JSON 200 bodies through', async () => {
    mockFetchResponse(200, '<html>gateway</html>', {
      'content-type': 'text/html',
    })

    const res = await openRouterFetch('https://openrouter.ai/api/v1/chat')

    expect(res.status).toBe(200)
  })
})
