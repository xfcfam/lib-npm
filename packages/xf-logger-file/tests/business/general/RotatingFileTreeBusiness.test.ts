import { describe, it, expect } from 'vitest'
import type { FileRepository } from '@xfcfam/xf-fs'
import { LoggerRepository } from '@xfcfam/xf-logger'
import type { LogRecord } from '@xfcfam/xf-logger'
import { RotatingFileTreeBusiness, type RotatingFileOptions } from '../../../index.js'

/** In-memory stand-in for the four FileRepository ops the tree uses. */
class MemFs {
  readonly files = new Map<string, string>()
  async append(path: string, content: string): Promise<void> {
    this.files.set(path, (this.files.get(path) ?? '') + content)
  }
  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }
  async stat(path: string): Promise<{ size: number }> {
    return { size: Buffer.byteLength(this.files.get(path) ?? '') }
  }
  async delete(path: string): Promise<void> {
    this.files.delete(path)
  }
}

const noopLogger = { tree() {} } as unknown as LoggerRepository

class TestFileTree extends RotatingFileTreeBusiness {
  clock = new Date('2026-06-13T08:00:00.000Z')
  constructor(
    private readonly mem: MemFs,
    options: RotatingFileOptions,
  ) {
    super(options)
  }
  protected file(): FileRepository {
    return this.mem as unknown as FileRepository
  }
  protected logger(): LoggerRepository {
    return noopLogger
  }
  protected override now(): Date {
    return this.clock
  }
}

function rec(message: string, level: LogRecord['level'] = 'info'): LogRecord {
  return { level, message, timestamp: new Date('2026-06-13T08:00:00.000Z') }
}

describe('RotatingFileTreeBusiness', () => {
  it('appends to a date-stamped file', async () => {
    const mem = new MemFs()
    const tree = new TestFileTree(mem, { path: 'logs/app.log' })
    await tree.init()
    await tree.handle(rec('first'))
    await tree.handle(rec('second'))
    const path = 'logs/app-2026-06-13.log'
    expect(mem.files.has(path)).toBe(true)
    expect(mem.files.get(path)).toBe('2026-06-13T08:00:00.000Z INFO  first\n2026-06-13T08:00:00.000Z INFO  second\n')
  })

  it('rotates by size into indexed files', async () => {
    const mem = new MemFs()
    // tiny cap so each ~40-byte line forces a rotation
    const tree = new TestFileTree(mem, { path: 'app.log', maxBytes: 30, maxFiles: 10 })
    await tree.init()
    await tree.handle(rec('a'))
    await tree.handle(rec('b'))
    await tree.handle(rec('c'))
    expect(mem.files.has('app-2026-06-13.log')).toBe(true) // index 0
    expect(mem.files.has('app-2026-06-13.1.log')).toBe(true) // index 1
    expect(mem.files.has('app-2026-06-13.2.log')).toBe(true) // index 2
  })

  it('prunes size-files beyond maxFiles', async () => {
    const mem = new MemFs()
    const tree = new TestFileTree(mem, { path: 'app.log', maxBytes: 30, maxFiles: 2 })
    await tree.init()
    for (const m of ['a', 'b', 'c', 'd']) await tree.handle(rec(m))
    // window of 2: the oldest (index 0, then 1) get pruned as the index advances
    expect(mem.files.has('app-2026-06-13.log')).toBe(false) // index 0 pruned
    expect(mem.files.has('app-2026-06-13.1.log')).toBe(false) // index 1 pruned
    expect(mem.files.has('app-2026-06-13.3.log')).toBe(true) // current
  })

  it('rotates on calendar-day change', async () => {
    const mem = new MemFs()
    const tree = new TestFileTree(mem, { path: 'app.log', maxBytes: 1_000_000 })
    await tree.init() // seeds day = 2026-06-13
    await tree.handle(rec('day one'))
    tree.clock = new Date('2026-06-14T09:00:00.000Z')
    await tree.handle(rec('day two'))
    expect(mem.files.has('app-2026-06-13.log')).toBe(true)
    expect(mem.files.has('app-2026-06-14.log')).toBe(true)
  })

  it('rotates correctly under concurrent fire-and-forget emits through the logger', async () => {
    const mem = new MemFs()
    class SilentLogger extends LoggerRepository {
      override writeConsole(): void {}
    }
    const log = new SilentLogger()
    class LiveFileTree extends RotatingFileTreeBusiness {
      constructor() {
        super({ path: 'app.log', maxBytes: 60, maxFiles: 20 })
      }
      protected file(): FileRepository {
        return mem as unknown as FileRepository
      }
      protected logger(): LoggerRepository {
        return log
      }
      protected override now(): Date {
        return new Date('2026-06-13T08:00:00.000Z')
      }
    }
    const tree = new LiveFileTree()
    await tree.init() // plants into the logger
    // emit fast, without awaiting each call — the logger dispatches concurrently
    for (let i = 0; i < 12; i++) log.info(`message number ${i}`)
    await log.flush()
    // serialisation kept the size checks ordered, so rotation actually happened
    expect(mem.files.size).toBeGreaterThan(1)
  })

  it('can disable daily rotation', async () => {
    const mem = new MemFs()
    const tree = new TestFileTree(mem, { path: 'app.log', maxBytes: 1_000_000, daily: false })
    await tree.init()
    await tree.handle(rec('one'))
    tree.clock = new Date('2026-07-01T00:00:00.000Z')
    await tree.handle(rec('two'))
    // same file despite the month change
    expect([...mem.files.keys()]).toEqual(['app-2026-06-13.log'])
  })
})
