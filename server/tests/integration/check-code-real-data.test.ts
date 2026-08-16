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
const allCodingTasks: { lessonId: string; course: string; task: CodingTask }[] = []
let courses: string[] = []

try {
  courses = readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name)

  for (const course of courses) {
    const lessonDirs = readdirSync(join(LESSONS_DIR, course), { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name)

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

const { mockRunnable } = createMockLLM()

vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: { fromMessages: vi.fn().mockReturnValue(mockRunnable) },
}))

vi.mock('@langchain/openai', () => ({ ChatOpenAI: vi.fn().mockImplementation(function() { return {} }) }))
vi.mock('@langchain/core/output_parsers', () => ({ StringOutputParser: vi.fn().mockImplementation(function() { return {} }) }))

let checkCode: typeof import('../../src/rag/query.js')['checkCode']

async function getCheckCode() {
  if (!checkCode) {
    const mod = await import('../../src/rag/query.js')
    checkCode = mod.checkCode
  }
  return checkCode
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
        mockRunnable.invoke.mockReset()
        mockRunnable.invoke.mockResolvedValue('{"passed":true,"feedback":"ok"}')
        const fn = await getCheckCode()
        const result = await fn(task.id, lessonId, 'mock code')
        expect(result).toEqual({ passed: true, feedback: 'ok' })
        const args = mockRunnable.invoke.mock.calls[0][0]
        expect(args.criteria).toBe(task.criteria.join('\n'))
        expect(args.code).toBe('mock code')
      })
    }
  }
})
