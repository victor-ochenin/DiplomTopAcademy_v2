import { vi } from 'vitest'

export function createMockFS() {
  const mockFS = new Map<string, { isDirectory: boolean; content?: string }>()

  function addFile(path: string, content: string) {
    mockFS.set(path.replace(/\\/g, '/'), { isDirectory: false, content })
  }

  function addDir(path: string) {
    mockFS.set(path.replace(/\\/g, '/'), { isDirectory: true })
  }

  return {
    mockFS,
    addFile,
    addDir,
    mockImpl: {
      readFileSync: vi.fn((path: string) => {
        const p = path.replace(/\\/g, '/')
        const file = mockFS.get(p)
        if (!file || file.isDirectory) {
          const err = new Error(`ENOENT: ${p}`) as NodeJS.ErrnoException
          err.code = 'ENOENT'
          throw err
        }
        return file.content
      }),
      readdirSync: vi.fn((path: string, opts?: { withFileTypes?: boolean }) => {
        const p = path.replace(/\\/g, '/')
        const names: { name: string; isDirectory(): boolean }[] = []
        for (const key of mockFS.keys()) {
          if (key.startsWith(p + '/')) {
            const rel = key.slice(p.length + 1)
            if (rel && !rel.includes('/')) {
              names.push({
                name: rel,
                isDirectory: () => mockFS.get(key)?.isDirectory ?? false,
              })
            }
          }
        }
        names.sort((a, b) => a.name.localeCompare(b.name))
        if (opts?.withFileTypes) { return names }
        return names.map(n => n.name)
      }),
      existsSync: vi.fn((path: string) => {
        const p = path.replace(/\\/g, '/')
        for (const key of mockFS.keys()) {
          if (key === p || key.startsWith(p + '/')) return true
        }
        return false
      }),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  }
}

export function createMockLLM() {
  const mockRunnable = { pipe: vi.fn().mockReturnThis(), invoke: vi.fn() }
  return { mockRunnable }
}
