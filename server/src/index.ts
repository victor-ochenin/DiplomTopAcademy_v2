import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import 'dotenv/config'
import {
  initRag,
  queryRag,
  checkCode,
  HistoryMessageSchema,
} from './rag/query.js'

const QuerySchema = z.object({
  question: z.string().min(1),
  history: z.array(HistoryMessageSchema).optional(),
})

const CheckCodeSchema = z.object({
  taskId: z.string().min(1),
  lessonId: z.string().min(1),
  code: z.string().min(1),
})

const validate = <T extends z.ZodTypeAny>(
  target: 'json',
  schema: T,
  errorMessage: string,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) return c.json({ error: errorMessage }, 400)
  })

const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors())

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('unhandled:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

let ready = false
initRag()
  .then(() => {
    ready = true
    console.log('RAG initialized')
  })
  .catch((err) => {
    console.error('RAG init failed:', err)
  })

app.post(
  '/api/query',
  validate('json', QuerySchema, 'question is required'),
  async (c) => {
    if (!ready) throw new HTTPException(503, { message: 'RAG not ready' })
    const { question, history } = c.req.valid('json')
    const result = await queryRag(question, history)
    return c.json(result)
  },
)

app.post(
  '/api/check-code',
  validate('json', CheckCodeSchema, 'taskId, lessonId and code are required'),
  async (c) => {
    const { taskId, lessonId, code } = c.req.valid('json')
    try {
      const result = await checkCode(taskId, lessonId, code)
      return c.json(result)
    } catch (err) {
      console.error('check-code failed', err)
      throw new HTTPException(500, { message: 'Failed to check code' })
    }
  },
)

const port = Number(process.env.PORT || 3001)
if (process.env.NODE_ENV !== 'test') {
  serve({ fetch: app.fetch, port })
  console.log(`Server on http://localhost:${port}`)
}

export { app }
