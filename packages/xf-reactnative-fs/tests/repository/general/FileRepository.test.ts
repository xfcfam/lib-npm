import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory fake of the native backend so the FileRepository logic
// (encoding, path resolution, rmdir empty-check, copy/move overwrite,
// error translation) can be exercised without a device.
vi.mock('@dr.pogodin/react-native-fs', () => {
  const store = new Map<string, Uint8Array>()
  const dirs = new Set<string>()
  const td = new TextDecoder()
  const te = new TextEncoder()
  const enoent = (p: string) => {
    const e = new Error(`ENOENT: no such file ${p}`) as Error & { code?: string }
    e.code = 'ENOENT'
    return e
  }
  const children = (p: string) =>
    [...store.keys()].some((k) => k.startsWith(`${p}/`)) || [...dirs].some((d) => d.startsWith(`${p}/`))
  return {
    __esModule: true,
    DocumentDirectoryPath: '/doc',
    CachesDirectoryPath: '/caches',
    TemporaryDirectoryPath: '/tmp',
    MainBundlePath: '/bundle',
    __reset: () => {
      store.clear()
      dirs.clear()
    },
    readFile: async (p: string, enc?: string) => {
      const b = store.get(p)
      if (!b) throw enoent(p)
      return enc === 'base64' ? Buffer.from(b).toString('base64') : td.decode(b)
    },
    writeFile: async (p: string, c: string, enc?: string) => {
      store.set(p, enc === 'base64' ? new Uint8Array(Buffer.from(c, 'base64')) : te.encode(c))
    },
    appendFile: async (p: string, c: string, enc?: string) => {
      const ex = store.get(p) ?? new Uint8Array()
      const add = enc === 'base64' ? new Uint8Array(Buffer.from(c, 'base64')) : te.encode(c)
      const m = new Uint8Array(ex.length + add.length)
      m.set(ex)
      m.set(add, ex.length)
      store.set(p, m)
    },
    unlink: async (p: string) => {
      if (store.has(p)) return void store.delete(p)
      if (dirs.has(p) || children(p)) {
        for (const k of [...store.keys()]) if (k === p || k.startsWith(`${p}/`)) store.delete(k)
        for (const d of [...dirs]) if (d === p || d.startsWith(`${p}/`)) dirs.delete(d)
        return
      }
      throw enoent(p)
    },
    exists: async (p: string) => store.has(p) || dirs.has(p) || children(p),
    stat: async (p: string) => {
      const b = store.get(p)
      if (b) return { path: p, ctime: new Date(0), mtime: new Date(0), size: b.length, mode: 420, originalFilepath: p, isFile: () => true, isDirectory: () => false }
      if (dirs.has(p) || children(p)) return { path: p, ctime: new Date(0), mtime: new Date(0), size: 0, mode: 493, originalFilepath: p, isFile: () => false, isDirectory: () => true }
      throw enoent(p)
    },
    readDir: async (p: string) => {
      const pre = p.endsWith('/') ? p : `${p}/`
      const names = new Map<string, boolean>()
      for (const k of store.keys()) if (k.startsWith(pre)) { const seg = k.slice(pre.length).split('/')[0]; if (seg) names.set(seg, store.has(pre + seg)) }
      for (const d of dirs) if (d.startsWith(pre)) { const seg = d.slice(pre.length).split('/')[0]; if (seg && !names.has(seg)) names.set(seg, false) }
      if (names.size === 0 && !dirs.has(p) && !children(p)) throw enoent(p)
      return [...names].map(([name, isFile]) => ({ ctime: new Date(0), mtime: new Date(0), name, path: pre + name, size: isFile ? store.get(pre + name)!.length : 0, isFile: () => isFile, isDirectory: () => !isFile }))
    },
    mkdir: async (p: string) => void dirs.add(p),
    copyFile: async (from: string, to: string) => { const b = store.get(from); if (!b) throw enoent(from); store.set(to, new Uint8Array(b)) },
    moveFile: async (from: string, to: string) => { const b = store.get(from); if (!b) throw enoent(from); store.set(to, new Uint8Array(b)); store.delete(from) },
  }
})

import * as RNFS from '@dr.pogodin/react-native-fs'
import { FileRepository } from '../../../src/repository/general/FileRepository.js'
import { FileNotFoundException } from '../../../src/repository/transfers/FileNotFoundException.js'
import { DirectoryNotEmptyException } from '../../../src/repository/transfers/DirectoryNotEmptyException.js'

class TestFileRepository extends FileRepository {
  constructor() {
    super({ rootPath: '/doc' })
  }
}

describe('FileRepository (React Native, mocked backend)', () => {
  let repo: TestFileRepository

  beforeEach(async () => {
    ;(RNFS as unknown as { __reset: () => void }).__reset()
    repo = new TestFileRepository()
    await repo.init()
  })

  it('round-trips UTF-8 text and resolves relative paths against rootPath', async () => {
    await repo.write('hello.txt', 'Hola, món! 🌍')
    expect(await repo.read('hello.txt')).toBe('Hola, món! 🌍')
    expect(await RNFS.exists('/doc/hello.txt')).toBe(true)
  })

  it('round-trips binary content through Base64', async () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255, 128, 7])
    await repo.write('bin.dat', bytes)
    expect([...(await repo.readBytes('bin.dat'))]).toEqual([...bytes])
  })

  it('appends and stats', async () => {
    await repo.write('a.txt', 'a')
    await repo.append('a.txt', 'bc')
    expect(await repo.read('a.txt')).toBe('abc')
    const s = await repo.stat('a.txt')
    expect(s.size).toBe(3)
    expect(s.isFile).toBe(true)
    expect(s.isSymlink).toBe(false)
  })

  it('lists and walks directories', async () => {
    await repo.mkdir('sub')
    await repo.write('sub/f1.txt', '1')
    await repo.write('sub/deep/g.txt', '3')
    expect((await repo.list('sub')).map((e) => e.name)).toEqual(['deep', 'f1.txt'])
    const walked = await repo.walk('sub')
    expect(walked.some((e) => e.relativePath === 'deep/g.txt')).toBe(true)
  })

  it('rmdir refuses a non-empty directory unless recursive', async () => {
    await repo.mkdir('d')
    await repo.write('d/f.txt', 'x')
    await expect(repo.rmdir('d')).rejects.toBeInstanceOf(DirectoryNotEmptyException)
    await repo.rmdir('d', { recursive: true })
    expect(await repo.exists('d')).toBe(false)
  })

  it('copy and move overwrite the destination', async () => {
    await repo.write('src.txt', 'payload')
    await repo.write('dst.txt', 'old')
    await repo.copy('src.txt', 'dst.txt')
    expect(await repo.read('dst.txt')).toBe('payload')
    await repo.move('src.txt', 'moved.txt')
    expect(await repo.read('moved.txt')).toBe('payload')
    expect(await repo.exists('src.txt')).toBe(false)
  })

  it('translates a missing file into FileNotFoundException', async () => {
    await expect(repo.read('nope.txt')).rejects.toBeInstanceOf(FileNotFoundException)
  })

  it('throws on the React Native boundary cases', async () => {
    expect(() => repo.readStream('x')).toThrow()
    expect(() => repo.writeStream('x')).toThrow()
    await expect(repo.watch('x', () => {})).rejects.toThrow()
  })
})
