import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createMockFS } from '../helpers/test-utils'

const { mockFS, addFile, addDir, mockImpl } = createMockFS()

vi.mock('node:fs', () => mockImpl)

// Мок ChromaDB: getCollection управляется из теста, чтобы различить
// «коллекции нет» (ChromaNotFoundError) и реальный сбой связи.
const chromaState = {
  getCollectionImpl: async (): Promise<unknown> => ({}),
  created: 0,
  deleted: 0,
}

class FakeChromaNotFoundError extends Error {
  constructor() {
    super('not found')
    this.name = 'ChromaNotFoundError'
  }
}

vi.mock('chromadb', () => ({
  ChromaNotFoundError: FakeChromaNotFoundError,
  ChromaClient: class {
    async getCollection() {
      return chromaState.getCollectionImpl()
    }
    async deleteCollection() {
      chromaState.deleted++
    }
    async createCollection() {
      chromaState.created++
      return { add: vi.fn() }
    }
    async heartbeat() {}
  },
}))

let vectorStore: typeof import('../../src/rag/vectorStore.js')
let LESSONS_DIR: string

beforeEach(async () => {
  mockFS.clear()
  chromaState.getCollectionImpl = async () => ({})
  chromaState.created = 0
  chromaState.deleted = 0
  vi.resetModules()
  vectorStore = await import('../../src/rag/vectorStore.js')
  LESSONS_DIR = vectorStore.LESSONS_DIR
})

// Обходит уроки, собирает все .json / .md, считает SHA-256.
describe('computeChecksum', () => {
  it('returns 64 hex chars for empty dir', () => {
    addDir(LESSONS_DIR)
    expect(vectorStore.computeChecksum()).toMatch(/^[a-f0-9]{64}$/)
  })

  it('changes when file content changes', () => {
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/jsx')
    addFile(LESSONS_DIR + '/jsx/lesson.json', '{"id":"jsx","documents":[]}')
    const hash1 = vectorStore.computeChecksum()

    // очищаем и пересоздаём с другим содержимым lesson.json
    mockFS.clear()
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/jsx')
    addFile(
      LESSONS_DIR + '/jsx/lesson.json',
      '{"id":"jsx","documents":[{"id":"a","title":"A"}]}',
    )
    const hash2 = vectorStore.computeChecksum()

    expect(hash1).not.toBe(hash2)
  })

  it('only considers .json and .md files', () => {
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/jsx')
    addFile(LESSONS_DIR + '/jsx/lesson.json', '{"id":"jsx","documents":[]}')
    addFile(LESSONS_DIR + '/jsx/notes.txt', 'this should be ignored')
    addFile(LESSONS_DIR + '/.DS_Store', 'ignored')

    const hash = vectorStore.computeChecksum()
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

// Читает lesson.json из каждой поддиректории, подгружает .md файлы
// и возвращает массив документов для индексации.
describe('loadDocuments', () => {
  it('returns [] when lessons dir does not exist', () => {
    expect(vectorStore.loadDocuments()).toEqual([])
  })

  it('returns [] for empty dir', () => {
    addDir(LESSONS_DIR)
    expect(vectorStore.loadDocuments()).toEqual([])
  })

  it('parses one lesson with one .md', () => {
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/what-is-react')
    addFile(
      LESSONS_DIR + '/what-is-react/lesson.json',
      JSON.stringify({
        id: 'what-is-react',
        documents: [
          { id: 'intro', title: 'Введение', contentFile: 'intro.md' },
        ],
      }),
    )
    addFile(LESSONS_DIR + '/what-is-react/intro.md', '# React')

    const docs = vectorStore.loadDocuments()
    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe('what-is-react__intro')
    expect(docs[0].content).toBe('# React')
    expect(docs[0].metadata.title).toBe('Введение')
  })

  it('skips doc when .md is missing', () => {
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/what-is-react')
    addFile(
      LESSONS_DIR + '/what-is-react/lesson.json',
      JSON.stringify({
        id: 'what-is-react',
        documents: [
          { id: 'intro', title: 'Введение', contentFile: 'intro.md' },
          { id: 'setup', title: 'Настройка', contentFile: 'setup.md' },
        ],
      }),
    )
    addFile(LESSONS_DIR + '/what-is-react/intro.md', '# React')

    const docs = vectorStore.loadDocuments()
    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe('what-is-react__intro')
  })

  it('returns [] for broken JSON', () => {
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/what-is-react')
    addFile(LESSONS_DIR + '/what-is-react/lesson.json', 'not json')

    expect(vectorStore.loadDocuments()).toEqual([])
  })

  it('handles multiple lessons', () => {
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/jsx')
    addFile(
      LESSONS_DIR + '/jsx/lesson.json',
      JSON.stringify({
        id: 'jsx',
        documents: [{ id: 'intro', title: 'JSX', contentFile: 'jsx-intro.md' }],
      }),
    )
    addFile(LESSONS_DIR + '/jsx/jsx-intro.md', '# JSX')
    addDir(LESSONS_DIR + '/props')
    addFile(
      LESSONS_DIR + '/props/lesson.json',
      JSON.stringify({
        id: 'props',
        documents: [
          { id: 'basics', title: 'Props', contentFile: 'props-basics.md' },
        ],
      }),
    )
    addFile(LESSONS_DIR + '/props/props-basics.md', '# Props')

    const docs = vectorStore.loadDocuments()
    expect(docs).toHaveLength(2)
    expect(docs.map((d) => d.id)).toContain('jsx__intro')
    expect(docs.map((d) => d.id)).toContain('props__basics')
  })
})

// ensureIndex должен переиндексировать, только если чексумма изменилась
// ИЛИ коллекции реально нет. Реальный сбой связи не должен выдаваться
// за «коллекции нет» — иначе валидная коллекция будет удалена и пересоздана.
describe('ensureIndex / hasCollection', () => {
  function seedLesson() {
    addDir(LESSONS_DIR)
    addDir(LESSONS_DIR + '/jsx')
    addFile(
      LESSONS_DIR + '/jsx/lesson.json',
      JSON.stringify({
        id: 'jsx',
        documents: [{ id: 'intro', title: 'JSX', contentFile: 'intro.md' }],
      }),
    )
    addFile(LESSONS_DIR + '/jsx/intro.md', '# JSX')
  }

  it('indexes when the collection is missing', async () => {
    seedLesson()
    chromaState.getCollectionImpl = async () => {
      throw new FakeChromaNotFoundError()
    }

    await vectorStore.ensureIndex()

    expect(chromaState.created).toBe(1)
  })

  it('rethrows non-not-found collection errors instead of recreating', async () => {
    seedLesson()
    chromaState.getCollectionImpl = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8000')
    }

    await expect(vectorStore.ensureIndex()).rejects.toThrow(/ECONNREFUSED/)
    // Транзиентный сбой связи не должен удалять валидную коллекцию.
    expect(chromaState.created).toBe(0)
    expect(chromaState.deleted).toBe(0)
  })
})
