import { ChromaClient } from 'chromadb'
import { createHash } from 'node:crypto'
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OpenRouterEmbeddingFunction } from './embeddings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const COLLECTION_NAME = 'nodomia'
const WEB_COLLECTION = 'web-docs'
const CHROMA_URL = 'http://localhost:8000'
const CHROMA_DATA_DIR = join(__dirname, '..', '..', 'data', 'chroma')
const LESSONS_DIR = join(__dirname, '..', '..', 'data', 'lessons')
const CHECKSUM_FILE = join(CHROMA_DATA_DIR, 'checksum.txt')
const WEB_CHECKSUM_FILE = join(CHROMA_DATA_DIR, 'web-checksum.txt')
const WEB_SOURCES_DIR = join(__dirname, '..', '..', 'data', 'web-sources')

export interface DocumentResult {
  pageContent: string
}

type QueryFn = (text: string, k?: number) => Promise<DocumentResult[]>

let queryCollection: QueryFn | null = null
let webQueryCollection: QueryFn | null = null

// SHA-256 от файлов в директории, отфильтрованных предикатом. Общий хэлпер
// для чексумм курсов и веб-источников. Пустая/отсутствующая директория → ''.
function hashFiles(dir: string, filter: (name: string) => boolean): string {
  if (!existsSync(dir)) return ''

  const files: string[] = []

  function walk(d: string) {
    const entries = readdirSync(d, { withFileTypes: true })
    for (const entry of entries.sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (filter(entry.name)) files.push(full)
    }
  }
  walk(dir)

  const hash = createHash('sha256')
  for (const file of files) hash.update(readFileSync(file))
  return hash.digest('hex')
}

// Вычисляет SHA-256 хэш от всех lesson.json и .md файлов в LESSONS_DIR.
export function computeChecksum(): string {
  return hashFiles(
    LESSONS_DIR,
    (name) => name === 'lesson.json' || name.endsWith('.md'),
  )
}

// Вычисляет SHA-256 хэш от всех `*.json` файлов в `web-sources/`.
function computeWebChecksum(): string {
  if (!existsSync(WEB_SOURCES_DIR)) return ''
  const hasSources = readdirSync(WEB_SOURCES_DIR).some((f) =>
    f.endsWith('.json'),
  )
  if (!hasSources) return ''
  return hashFiles(WEB_SOURCES_DIR, (name) => name.endsWith('.json'))
}

// Загружает все документы курса из LESSONS_DIR.
// Читает lesson.json → contentFile → содержимое .md файла.
// Возвращает массив { id, content, metadata } для индексации в ChromaDB.
export function loadDocuments(): {
  id: string
  content: string
  metadata: Record<string, string>
}[] {
  const results: {
    id: string
    content: string
    metadata: Record<string, string>
  }[] = []

  if (!existsSync(LESSONS_DIR)) {
    console.warn(`Nodomia RAG: lessons dir not found at ${LESSONS_DIR}`)
    return results
  }

  function walkDir(dir: string) {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (err) {
      console.warn(`Nodomia RAG: cannot read directory ${dir}: ${err}`)
      return
    }

    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walkDir(full)
        continue
      }
      if (entry.name !== 'lesson.json') continue

      let raw: string
      try {
        raw = readFileSync(full, 'utf-8')
      } catch (err) {
        console.warn(`Nodomia RAG: cannot read ${full}: ${err}`)
        continue
      }

      let data: {
        id?: string
        documents?: { id?: string; title?: string; contentFile?: string }[]
      }
      try {
        data = JSON.parse(raw)
      } catch (err) {
        console.warn(`Nodomia RAG: invalid JSON in ${full}: ${err}`)
        continue
      }

      const lessonId = data.id ?? 'unknown'
      const lessonDir = dirname(full)

      for (const doc of data.documents ?? []) {
        if (
          typeof doc?.contentFile !== 'string' ||
          !doc.contentFile.endsWith('.md')
        )
          continue

        const mdPath = join(lessonDir, basename(doc.contentFile))
        let mdContent: string
        try {
          mdContent = readFileSync(mdPath, 'utf-8')
        } catch {
          console.warn(
            `Nodomia RAG: .md not found for ${doc.id ?? '?'} in ${full}`,
          )
          continue
        }

        results.push({
          id: `${lessonId}__${doc.id ?? '?'}`,
          content: mdContent,
          metadata: {
            source: mdPath,
            title: doc.title ?? '',
            lessonId,
          },
        })
      }
    }
  }

  walkDir(LESSONS_DIR)
  return results
}

async function ensureCollection(
  name: string,
  checksumFile: string,
  computeFn: () => string,
  loadData: () =>
    | Promise<
        { id: string; content: string; metadata: Record<string, string> }[]
      >
    | { id: string; content: string; metadata: Record<string, string> }[],
): Promise<QueryFn> {
  mkdirSync(CHROMA_DATA_DIR, { recursive: true })

  const client = new ChromaClient({ path: CHROMA_URL })
  const embedder = new OpenRouterEmbeddingFunction({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'nvidia/llama-nemotron-embed-vl-1b-v2:free',
  })

  const current = computeFn()
  let prev = ''
  try {
    prev = readFileSync(checksumFile, 'utf-8').trim()
  } catch {
    /* not exist */
  }

  if (current && current !== prev) {
    try {
      await client.deleteCollection({ name })
    } catch {
      /* not exist */
    }

    const collection = await client.createCollection({
      name,
      embeddingFunction: embedder,
      metadata: { 'hnsw:space': 'cosine' },
    })
    const docs = await loadData()

    if (docs.length > 0) {
      const batchSize = 100
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize)
        await collection.add({
          ids: batch.map((d) => d.id),
          documents: batch.map((d) => d.content),
          metadatas: batch.map((d) => d.metadata),
        })
      }
      console.log(`Indexed ${docs.length} documents into ${name}`)
    }

    writeFileSync(checksumFile, current)
  }

  if (!current) {
    // Нет данных для индексации (директория отсутствует/пустая): пустой результат
    // вместо обращения к несуществующей коллекции Chroma.
    return async () => []
  }

  return async (text: string, k = 3) => {
    const collection = await client.getCollection({
      name,
      embeddingFunction: embedder,
    })
    const r = await collection.query({ queryTexts: [text], nResults: k })
    return (r.documents?.[0] ?? []).map((content) => ({
      pageContent: content ?? '',
    }))
  }
}

// Проверка реальной связи с ChromaDB: heartbeat — фактический HTTP-запрос к серверу.
// Нужен потому, что при неизменной чексумме ensureIndex() не контактирует с ChromaDB вовсе.
export async function testChromaConnection(): Promise<void> {
  const client = new ChromaClient({ path: CHROMA_URL })
  await client.heartbeat()
}

export async function ensureIndex(): Promise<void> {
  queryCollection = await ensureCollection(
    COLLECTION_NAME,
    CHECKSUM_FILE,
    computeChecksum,
    loadDocuments,
  )
}

export async function ensureWebIndex(): Promise<void> {
  const loadWebData = async () => {
    const { loadWebSources, scrapeUrls } = await import('./webFetcher.js')
    const sources = loadWebSources(WEB_SOURCES_DIR)
    if (sources.length === 0) {
      return []
    }
    return scrapeUrls(sources)
  }
  webQueryCollection = await ensureCollection(
    WEB_COLLECTION,
    WEB_CHECKSUM_FILE,
    computeWebChecksum,
    loadWebData,
  )
}

// Объединяет результаты поиска по документам курсов и веб-источникам.
// Сначала веб-документы, затем курсы (веб-документы обычно актуальнее).
export async function queryAll(text: string): Promise<DocumentResult[]> {
  const [courseDocs, webDocs] = await Promise.all([
    queryCollection!(text, 2),
    webQueryCollection!(text, 2),
  ])
  return [...webDocs, ...courseDocs]
}

export { LESSONS_DIR }
