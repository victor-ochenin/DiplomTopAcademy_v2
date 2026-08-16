import * as cheerio from 'cheerio'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const FETCH_OPTIONS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NodomiaBot/1.0; +https://nodomia.app)',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'ru,en;q=0.9',
  },
  signal: AbortSignal.timeout(10000),
}

interface WebPage {
  url: string
  title: string
  content: string
}

interface Chunk {
  id: string
  content: string
  metadata: Record<string, string>
}

interface WebSource {
  id: string
  url: string
  depth: number
}

// Загружает конфигурацию веб-источников из всех *.json файлов в директории.
// Возвращает массив WebSource[].
export function loadWebSources(dir: string): WebSource[] {
  if (!existsSync(dir)) return []

  const results: WebSource[] = []
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        results.push(...parsed)
      } else {
        console.warn(`Nodomia RAG: ${file} must contain an array`)
      }
    } catch (err) {
      console.warn(`Nodomia RAG: invalid web source ${file}: ${err}`)
    }
  }
  return results
}

// Загружает HTML страницы по URL, чистит от мусора (script, nav, footer и т.д.),
// извлекает title, заголовки h1-h3 и основной контент.
// При любой ошибке или не-OK статусе возвращает null.
export async function fetchWebContent(url: string): Promise<WebPage | null> {
  try {
    const res = await fetch(url, FETCH_OPTIONS)
    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    $('script, style, nav, footer, aside, iframe, svg, noscript, [role="navigation"], [role="banner"]').remove()

    const title = $('title').first().text().trim() || url

    let content = ''
    const main = $('main, article, [role="main"], .documentation, .content, #content, .markdown').first()
    if (main.length) {
      content = main.html() || ''
    } else {
      content = $('body').html() || ''
    }

    content = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<[^>]+>/g, '')
    content = content.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

    return { url, title, content }
  } catch {
    return null
  }
}

// Разделяет содержимое страницы на чанки по заголовкам markdown (#, ##, ###).
// Каждый чанк получает id вида {sourceId}__{index}.
// Если заголовков нет — возвращает один чанк со всем содержимым.
export function chunkPage(page: WebPage, sourceId: string): Chunk[] {
  const chunks: Chunk[] = []
  let chunkIndex = 0

  const sections = page.content.split(/\n(?=#{1,3}\s)/)

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue

    const lines = trimmed.split('\n')
    const heading = lines[0].replace(/^#+\s*/, '').trim()

    // Пропускаем чанки, где нет осмысленного текста после заголовка
    const bodyText = lines.slice(1).join(' ').trim()
    if (bodyText.length < 20) continue

    chunks.push({
      id: `${sourceId}__${chunkIndex}`,
      content: trimmed,
      metadata: {
        url: page.url,
        title: heading || page.title,
        heading,
        index: String(chunkIndex),
      },
    })
    chunkIndex++
  }

  if (chunks.length === 0 && page.content) {
    chunks.push({
      id: `${sourceId}__0`,
      content: page.content,
      metadata: { url: page.url, title: page.title, heading: '', index: '0' },
    })
  }

  return chunks
}

// Обходит список источников, при depth >= 1 собирает внутренние ссылки (тот же origin),
// загружает каждую страницу через fetchWebContent и нарезает на чанки через chunkPage.
// Защита от дублей через visited Set.
export async function scrapeUrls(sources: WebSource[]): Promise<Chunk[]> {
  const allChunks: Chunk[] = []
  const visited = new Set<string>()

  for (const source of sources) {
    const urls: string[] = [source.url]

    if (source.depth >= 1) {
      const html = await fetch(source.url, FETCH_OPTIONS).then(r => r.text()).catch(() => '')
      if (html) {
        const $ = cheerio.load(html)
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href')
          if (!href) return
          try {
            const resolved = new URL(href, source.url)
            if (resolved.origin === new URL(source.url).origin) {
              urls.push(resolved.toString())
            }
          } catch { /* skip */ }
        })
      }
    }

    for (const url of urls) {
      if (visited.has(url)) continue
      visited.add(url)

      const page = await fetchWebContent(url)
      if (!page) continue

      allChunks.push(...chunkPage(page, source.id))
    }
  }

  return allChunks
}
