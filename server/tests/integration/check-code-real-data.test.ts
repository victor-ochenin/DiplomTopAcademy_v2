import { vi, describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LESSONS_DIR = join(__dirname, '..', '..', 'data', 'lessons')

interface CodingTask {
  id: string
  type: string
  criteria: string[]
  question: string
}

// собираем все реальные coding-задачи (на уровне модуля, до сбора тестов)
const allCodingTasks: { lessonId: string; course: string; task: CodingTask }[] =
  []
let courses: string[] = []

try {
  courses = readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  for (const course of courses) {
    const lessonDirs = readdirSync(join(LESSONS_DIR, course), {
      withFileTypes: true,
    })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    for (const lessonId of lessonDirs) {
      const lessonPath = join(LESSONS_DIR, course, lessonId, 'lesson.json')
      if (!existsSync(lessonPath)) continue
      const lesson = JSON.parse(readFileSync(lessonPath, 'utf-8'))
      if (!lesson.tasks) continue
      for (const task of lesson.tasks) {
        if (task.type === 'coding') {
          allCodingTasks.push({ lessonId, course, task: task as CodingTask })
        }
      }
    }
  }
} catch {
  // data/lessons может отсутствовать в CI — тест просто пропустит проверку данных
}

import { createMockLLM } from '../helpers/test-utils'
import { setGradingClientFactory } from '../../src/rag/grading.js'

const { mockRunnable } = createMockLLM()

vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: { fromMessages: vi.fn().mockReturnValue(mockRunnable) },
}))

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(function () {
    return {}
  }),
}))
vi.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: vi.fn().mockImplementation(function () {
    return {}
  }),
}))

let checkCode: (typeof import('../../src/rag/query.js'))['checkCode']

async function getCheckCode() {
  if (!checkCode) {
    const mod = await import('../../src/rag/query.js')
    checkCode = mod.checkCode
  }
  return checkCode
}

// Фейковый jev: фиксируем последний запрос, чтобы проверить, что реальные
// критерии из lesson.json действительно доходят до модели.
function installFakeGrading(captured: { request?: unknown }) {
  setGradingClientFactory(() => ({
    async systemOne(request: unknown) {
      captured.request = request
      const criteria = (request as { state: { task: { criteria: string[] } } })
        .state.task.criteria
      return {
        model: 'jev-fake',
        answers: {
          ...Object.fromEntries(
            criteria.map((_c, index) => [
              `criterion_${index}`,
              { type: 'noul', noul: 1 },
            ]),
          ),
          has_blocking_violation: { type: 'noul', noul: 0 },
          overall: { type: 'score', score: 3, confidence: 0.9 },
        },
        usage: { input_tokens: 10, output_tokens: 5 },
      }
    },
  }))
}

describe('checkCode with real lesson data', () => {
  if (allCodingTasks.length === 0) {
    it('пропущен — папка data/lessons не найдена', () => {
      console.warn('check-code-real-data: data/lessons not found, skipping')
    })
  } else {
    it(`найдено ${allCodingTasks.length} coding-задач в курсах ${courses.join(', ')}`, () => {
      expect(allCodingTasks.length).toBeGreaterThan(0)
    })

    for (const { lessonId, course, task } of allCodingTasks) {
      it(`[${course}/${lessonId}] ${task.id}: находит задачу и передаёт criteria`, async () => {
        const captured: { request?: unknown } = {}
        installFakeGrading(captured)
        const fn = await getCheckCode()
        const result = await fn(task.id, lessonId, 'mock code')

        // Реальные критерии и формулировка задания уходят в jev как state,
        // а не склеенной строкой промпта.
        const request = captured.request as {
          state: {
            task: { criteria: string[]; question: string }
            submission: { code: string }
          }
          questions: Record<string, unknown>
        }
        expect(request.state.task.criteria).toEqual(task.criteria)
        expect(request.state.task.question).toBe(task.question)
        expect(request.state.submission.code).toBe('mock code')
        expect(Object.keys(request.questions)).toContain('overall')

        // Контракт ответа прежний: { passed, feedback } с непустым текстом.
        expect(typeof result.passed).toBe('boolean')
        expect(result.feedback.length).toBeGreaterThan(0)
      })
    }
  }
})
