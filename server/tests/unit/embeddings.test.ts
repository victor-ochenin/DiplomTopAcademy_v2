import { vi, describe, it, expect, beforeEach } from 'vitest'

const fetchMock = vi.fn()
globalThis.fetch = fetchMock

let OpenRouterEmbeddingFunction: typeof import('../../src/rag/embeddings.js')['OpenRouterEmbeddingFunction']

beforeEach(async () => {
  fetchMock.mockReset()
  const mod = await import('../../src/rag/embeddings.js')
  OpenRouterEmbeddingFunction = mod.OpenRouterEmbeddingFunction
})

const mockResponse = (data: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  } as Response)

describe('OpenRouterEmbeddingFunction', () => {
  it('sends correct request body and headers', async () => {
    fetchMock.mockResolvedValue(mockResponse({ data: [{ index: 0, embedding: [0.1] }] }))
    const emb = new OpenRouterEmbeddingFunction({ apiKey: 'sk-test' })
    await emb.generate(['hello'])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk-test',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', input: ['hello'] }),
      })
    )
  })

  it('sorts embeddings by index', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      data: [
        { index: 1, embedding: [0.2, 0.3] },
        { index: 0, embedding: [0.1, 0.2] },
      ],
    }))
    const emb = new OpenRouterEmbeddingFunction({ apiKey: 'sk-test' })
    const result = await emb.generate(['a', 'b'])
    expect(result).toEqual([[0.1, 0.2], [0.2, 0.3]])
  })

  it('throws on non-ok status', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: 'rate limited' }, 429))
    const emb = new OpenRouterEmbeddingFunction({ apiKey: 'sk-test' })
    await expect(emb.generate(['x'])).rejects.toThrow('OpenRouter embedding failed (429)')
  })

  it('throws when data is missing', async () => {
    fetchMock.mockResolvedValue(mockResponse({}))
    const emb = new OpenRouterEmbeddingFunction({ apiKey: 'sk-test' })
    await expect(emb.generate(['x'])).rejects.toThrow('OpenRouter returned invalid embedding response')
  })

  it('throws when indexes are incomplete or duplicated', async () => {
    fetchMock.mockResolvedValue(mockResponse({
      data: [{ index: 0, embedding: [0.1] }, { index: 0, embedding: [0.2] }],
    }))
    const emb = new OpenRouterEmbeddingFunction({ apiKey: 'sk-test' })
    await expect(emb.generate(['a', 'b'])).rejects.toThrow('OpenRouter returned incomplete embedding response')
  })

  it('uses OPENAI_API_KEY from env when apiKey not passed', async () => {
    const prev = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'env-key'
    fetchMock.mockResolvedValue(mockResponse({ data: [{ index: 0, embedding: [0.1] }] }))
    const emb = new OpenRouterEmbeddingFunction({})
    await emb.generate(['x'])
    const authHeader = fetchMock.mock.calls[0][1].headers.Authorization
    expect(authHeader).toBe('Bearer env-key')
    process.env.OPENAI_API_KEY = prev
  })
})
