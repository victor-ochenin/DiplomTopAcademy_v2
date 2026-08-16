import { z } from 'zod'

const OPENROUTER_BASE =
  process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1'

const EmbeddingItemSchema = z.object({
  index: z.number().int().nonnegative(),
  embedding: z.array(z.number()),
})

// кастомный класс (адаптер) эмбеддингов для ChromaDB
// ChromaDB ожидает интерфейс { generate(texts: string[]): number[][], name?: string, getConfig?(): any }
// штатный OpenAIEmbeddingFunction не умеет работать через OpenRouter
export class OpenRouterEmbeddingFunction {
  private apiKey: string | undefined
  private model: string
  readonly name = 'openrouter'

  constructor({ apiKey, model }: { apiKey?: string; model?: string }) {
    this.apiKey = apiKey
    this.model = model || 'nvidia/llama-nemotron-embed-vl-1b-v2:free'
  }

  getConfig() {
    return { model: this.model, source: 'env' }
  }

  async generate(texts: string[]): Promise<number[][]> {
    const key = this.apiKey || process.env.OPENAI_API_KEY
    const res = await fetch(`${OPENROUTER_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenRouter embedding failed (${res.status}): ${err}`)
    }
    const json = await res.json()
    const items = z.array(EmbeddingItemSchema).safeParse(json.data)
    if (!items.success) {
      throw new Error('OpenRouter returned invalid embedding response')
    }
    // Индексы должны быть непротиворечивыми: ровно по одному на каждый входной текст.
    // Иначе сортировка вернёт меньше эмбеддингов или свяжет их с неверным текстом.
    const indexes = new Set(items.data.map((item) => item.index))
    if (
      items.data.length !== texts.length ||
      indexes.size !== texts.length ||
      [...indexes].some((index) => index >= texts.length)
    ) {
      throw new Error('OpenRouter returned incomplete embedding response')
    }
    // OpenRouter возвращает массив в произвольном порядке — сортируем по index
    return items.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
  }
}
