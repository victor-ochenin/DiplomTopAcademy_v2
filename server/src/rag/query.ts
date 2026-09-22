import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ChatOpenAI, type ClientOptions } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import {
  ensureIndex,
  ensureWebIndex,
  testChromaConnection,
  queryAll,
  LESSONS_DIR,
} from './vectorStore.js'
import { OpenRouterEmbeddingFunction } from './embeddings.js'
import { gradeSubmission, type GradingVerdict } from './grading.js'
import { filterContext } from './retrieval.js'

export const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string(),
})
export type HistoryMessage = z.infer<typeof HistoryMessageSchema>
const CodingTaskSchema = z.object({
  id: z.string().min(1),
  type: z.literal('coding'),
  kind: z.enum(['file', 'project']),
  question: z.string().min(1),
  criteria: z.array(z.string().min(1)).min(1),
})

// OpenRouter при перегрузке провайдера отвечает 200, но в теле `error` вместо
// `choices`. openai-SDK такой статус не ретраит, LangChain строит пустой
// generations и падает на `chatGeneration.message` (TypeError). Превращаем
// ответ без choices в 503 — SDK ретраит по status >= 500 (maxRetries: 2).
export async function openRouterFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status !== 200) return res

  let text: string
  try {
    text = await res.clone().text()
  } catch {
    return res
  }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return res
  }

  const choices =
    body && typeof body === 'object'
      ? (body as { choices?: unknown }).choices
      : undefined
  if (Array.isArray(choices) && choices.length > 0) return res

  return new Response(text, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'content-type': 'application/json' },
  })
}

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'nvidia/nemotron-3-super-120b-a12b:free',
  temperature: 0.3,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    // openai-SDK и глобальный fetch используют несовместимые RequestInfo
    // из разных шимов — рантайм один (undici), cast только на типах.
    fetch: openRouterFetch as unknown as ClientOptions['fetch'],
  },
})

// Проверка связи с OpenRouter: реальный эмбеддинг-запрос маленькой строки
// и обычный запрос к chat-эндпоинту (тому же, что использует ассистент для ответов).
export async function testOpenRouterConnection(): Promise<void> {
  const embedder = new OpenRouterEmbeddingFunction({
    apiKey: process.env.OPENAI_API_KEY,
  })
  await embedder.generate(['test'])
  await model.invoke('Скажи только слово "ок"')
}

// Инициализация RAG: проверяет связь с ChromaDB и OpenRouter, затем запускает
// индексацию документов курсов и веб-источников в ChromaDB.
// Вызывается однократно при старте сервера. Если чексумма не изменилась — пропускает переиндексацию.
export async function initRag(): Promise<void> {
  await testChromaConnection()
  await testOpenRouterConnection()
  await ensureIndex()
  await ensureWebIndex()
}

// RAG-запрос: ищет релевантные документы по вопросу, формирует контекст и отправляет в LLM.
// history — опциональная переписка для поддержания контекста диалога.
// Возвращает ответ на основе найденных документов.
export async function queryRag(
  question: string,
  history?: HistoryMessage[],
): Promise<{ answer: string }> {
  const docs = await queryAll(question)

  // Фильтр контекста: relevance + анти-injection + противоречия, пороги в коде.
  // Недоверенный ввод (webFetcher → cheerio) не доходит до промпта.
  const filtered = await filterContext(question, docs)
  console.log(
    `Nodomia: retrieval kept=${filtered.kept.length}/${filtered.total}` +
      ` (injection=${filtered.droppedInjection}, contradicts=${filtered.droppedContradicts}, irrelevant=${filtered.droppedIrrelevant})` +
      ` input=${filtered.usage.input_tokens} output=${filtered.usage.output_tokens}`,
  )

  const historyBlock = history?.length
    ? history.map((m) => `${m.role}: ${m.text}`).join('\n') + '\n\n'
    : ''

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are an assistant for React and Vue courses. Answer in your own words using the provided context. Do not copy the context text verbatim — paraphrase. If you include code examples, write your own, do not copy from the context. If the context does not contain the answer, say:
"В моей базе знаний не нашлось ответа на этот вопрос. Попробуйте самостоятельно поискать ответ."
Be brief. Do not use concluding phrases like "Таким образом", "В итоге", "Итак" etc.`,
    ],
    ['human', '{history}Context: {context}\n\nQuestion: {question}'],
  ])

  const answer = await prompt
    .pipe(model)
    .pipe(new StringOutputParser())
    .invoke({
      history: historyBlock,
      context: filtered.kept.map((d) => d.pageContent).join('\n\n'),
      question,
    })

  return { answer }
}

// Собирает текст фидбека из типизированного вердикта. Чистый маппинг
// failedCriteria → текст, без второго обращения к LLM (стоимость не удваивается).
export function buildFeedback(verdict: GradingVerdict): string {
  if (verdict.blocking) {
    return 'Решение не прошло проверку: обнаружено блокирующее нарушение — код не компилируется, нарушает правила темы или не относится к заданию.'
  }

  if (verdict.passed) {
    const remarks = failedCriteriaFeedback(verdict.failedCriteria)
    return remarks === ''
      ? 'Все критерии задания выполнены. Отличная работа!'
      : `Задание зачтено, но есть замечания.\n${remarks}`
  }

  const details = failedCriteriaFeedback(verdict.failedCriteria)
  if (details !== '') return `Задание не зачтено.\n${details}`

  return 'Задание не зачтено: решение не соответствует критериям в достаточной мере.'
}

function failedCriteriaFeedback(failedCriteria: string[]): string {
  if (failedCriteria.length === 0) return ''
  const bullets = failedCriteria.map((c) => `— ${c}`).join('\n')
  return `Не выполнены критерии:\n${bullets}`
}

// Проверяет код пользователя. Находит задачу по taskId в lesson.json,
// получает типизированный вердикт от jev (gradeSubmission) и собирает фидбек в коде,
// возвращая прежний контракт { passed, feedback }.
export async function checkCode(
  taskId: string,
  lessonId: string,
  code: string,
): Promise<{ passed: boolean; feedback: string }> {
  const courses = readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  let lessonPath = ''
  for (const course of courses) {
    const candidate = join(LESSONS_DIR, course, lessonId, 'lesson.json')
    if (existsSync(candidate)) {
      lessonPath = candidate
      break
    }
  }
  if (!lessonPath) throw new Error(`Lesson ${lessonId} not found`)
  const lesson = JSON.parse(readFileSync(lessonPath, 'utf-8'))
  const rawTask = (lesson.tasks ?? []).find(
    (t: unknown) => (t as { id?: unknown })?.id === taskId,
  )
  if (!rawTask) throw new Error(`Task ${taskId} not found`)
  const task = CodingTaskSchema.safeParse(rawTask)
  if (!task.success)
    throw new Error(`Task ${taskId} invalid: ${task.error.issues[0].message}`)

  // Типизированный вердикт от jev: битый JSON невозможен, интерфейс гарантирован.
  const verdict = await gradeSubmission(task.data, code)

  if (verdict.needsReview) {
    console.warn(
      `Nodomia: check-code needs review (task=${taskId}, lesson=${lessonId}, coverage=${verdict.coverage.toFixed(2)})`,
    )
  }
  console.log(
    `Nodomia: check-code usage input=${verdict.usage.input_tokens} output=${verdict.usage.output_tokens}`,
  )

  return { passed: verdict.passed, feedback: buildFeedback(verdict) }
}

export { LESSONS_DIR }
