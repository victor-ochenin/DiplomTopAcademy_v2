import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { z } from 'zod'
import 'dotenv/config'
import { initRag, queryRag, checkCode } from './rag/query.js'

const QuerySchema = z.object({
  question: z.string().min(1),
  history: z.array(z.object({ role: z.string(), text: z.string() })).optional(),
})

const CheckCodeSchema = z.object({
  taskId: z.string(),
  lessonId: z.string(),
  code: z.string(),
  kind: z.enum(['file', 'project']).optional(),
})

const app = new Hono()

// Логирует каждый входящий запрос: метод, путь, статус, время ответа
app.use('*', logger())

app.use('/api/*', cors())

let ready = false
initRag()
  .then(() => { ready = true; console.log('RAG initialized') })
  .catch(err => { console.error('RAG init failed:', err) })

// Запрос к RAG: вопрос от пользователя → ответ по материалам курса
app.post('/api/query', async (c) => {
  if (!ready) return c.json({ error: 'RAG not ready' }, 503)
  const body = await c.req.json().catch(() => null)
  const parsed = QuerySchema.safeParse(body ?? {})
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return c.json({ error: `${issue.path.join('.') || 'body'}: ${issue.message}` }, 400)
  }
  const result = await queryRag(parsed.data.question, parsed.data.history)
  return c.json(result)
})

// Проверка кода пользователя через LLM. Читает lesson.json, находит задачу по taskId,
// отправляет код + критерии в LLM, возвращает { passed, feedback }.
app.post('/api/check-code', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = CheckCodeSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return c.json({ error: 'taskId, lessonId and code are required' }, 400)
  }
  try {
    const result = await checkCode(parsed.data.taskId, parsed.data.lessonId, parsed.data.code, parsed.data.kind)
    return c.json(result)
  } catch (err) {
    console.error('check-code failed', err)
    return c.json({ error: 'Failed to check code' }, 500)
  }
})

const port = Number(process.env.PORT || 3001)
// не стартуем HTTP-сервер во время тестов — Vitest выставляет NODE_ENV=test
if (process.env.NODE_ENV !== 'test') {
  serve({ fetch: app.fetch, port })
  console.log(`Server on http://localhost:${port}`)
}

// экспорт app для тестов: app.request() симулирует HTTP без реального сервера
export { app }
