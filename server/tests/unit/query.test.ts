import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockFS, createMockLLM } from '../helpers/test-utils'

const { mockFS, addFile, addDir, mockImpl } = createMockFS()
const { mockRunnable } = createMockLLM()

vi.mock('node:fs', () => mockImpl)

vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: { fromMessages: vi.fn().mockReturnValue(mockRunnable) },
}))

vi.mock('@langchain/openai', () => ({ ChatOpenAI: vi.fn().mockImplementation(function() { return {} }) }))
vi.mock('@langchain/core/output_parsers', () => ({ StringOutputParser: vi.fn().mockImplementation(function() { return {} }) }))

let mod: typeof import('../../src/rag/query.js')

beforeEach(async () => {
  mockFS.clear()
  mockRunnable.invoke.mockReset()
  mod = await import('../../src/rag/query.js')
})

function setupLesson(lessonId = 'what-is-react') {
  const dir = mod.LESSONS_DIR
  addDir(dir)
  addDir(dir + '/react-basics')
  addDir(dir + '/react-basics/' + lessonId)
  addFile(dir + '/react-basics/' + lessonId + '/lesson.json', JSON.stringify({
    id: lessonId,
    tasks: [{
      id: 'task1',
      type: 'coding',
      kind: 'file',
      question: 'Write a component',
      criteria: ['Uses JSX', 'Is a valid component'],
      expectedFiles: ['App.jsx'],
    }],
  }))
}

describe('checkCode', () => {
  it('returns { passed, feedback } for valid request', async () => {
    setupLesson('what-is-react')
    mockRunnable.invoke.mockResolvedValue('{"passed":true,"feedback":"good"}')
    const result = await mod.checkCode('task1', 'what-is-react', 'function App() {}')
    expect(result).toEqual({ passed: true, feedback: 'good' })
  })

  it('passes criteria and code to LLM', async () => {
    setupLesson('what-is-react')
    mockRunnable.invoke.mockResolvedValue('{"passed":true,"feedback":"ok"}')
    await mod.checkCode('task1', 'what-is-react', 'code', 'project')
    const args = mockRunnable.invoke.mock.calls[0][0]
    expect(args.criteria).toContain('Uses JSX')
    expect(args.code).toBe('code')
  })

  it('returns fallback for non-JSON LLM response', async () => {
    setupLesson('what-is-react')
    mockRunnable.invoke.mockResolvedValue('not json')
    const result = await mod.checkCode('task1', 'what-is-react', 'code')
    expect(result).toEqual({ passed: false, feedback: 'Не удалось обработать ответ проверки.' })
  })

  it('returns fallback when JSON fields are missing or wrong-typed', async () => {
    setupLesson('what-is-react')
    mockRunnable.invoke.mockResolvedValue('{}')
    const result = await mod.checkCode('task1', 'what-is-react', 'code')
    expect(result).toEqual({ passed: false, feedback: 'Не удалось обработать ответ проверки.' })
  })

  it('returns fallback when passed is a string instead of boolean', async () => {
    setupLesson('what-is-react')
    mockRunnable.invoke.mockResolvedValue('{"passed":"false","feedback":"x"}')
    const result = await mod.checkCode('task1', 'what-is-react', 'code')
    expect(result).toEqual({ passed: false, feedback: 'Не удалось обработать ответ проверки.' })
  })

  it('returns parsed result when JSON is valid', async () => {
    setupLesson('what-is-react')
    mockRunnable.invoke.mockResolvedValue('{"passed":true,"feedback":"ok"}')
    const result = await mod.checkCode('task1', 'what-is-react', 'code')
    expect(result).toEqual({ passed: true, feedback: 'ok' })
  })

  it('throws when lesson is not found', async () => {
    addDir(mod.LESSONS_DIR)
    await expect(mod.checkCode('task1', 'nonexistent', 'code')).rejects.toThrow('Lesson nonexistent not found')
  })

  it('throws when task is not found', async () => {
    setupLesson('what-is-react')
    await expect(mod.checkCode('task99', 'what-is-react', 'code')).rejects.toThrow('Task task99 not found')
  })
})
