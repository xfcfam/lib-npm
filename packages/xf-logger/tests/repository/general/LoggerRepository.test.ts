import { describe, it, expect } from 'vitest'
import {
  LoggerRepository,
  LogLevelUtils,
  LogFormatUtils,
  type LogRecord,
} from '../../../index.js'

/** Captures console output instead of touching stdout/stderr. */
class CaptureLogger extends LoggerRepository {
  readonly lines: Array<{ line: string; stream: 'stdout' | 'stderr' }> = []
  override writeConsole(line: string, stream: 'stdout' | 'stderr' = 'stdout'): void {
    this.lines.push({ line, stream })
  }
}

describe('LoggerRepository', () => {
  it('writes a console default line per accepted record', () => {
    const log = new CaptureLogger({ name: 'app' })
    log.info('hello', { a: 1 })
    expect(log.lines).toHaveLength(1)
    expect(log.lines[0]?.line).toContain('hello')
    expect(log.lines[0]?.stream).toBe('stdout')
  })

  it('routes warn-and-above to stderr', () => {
    const log = new CaptureLogger()
    log.warn('careful')
    log.error('boom')
    expect(log.lines.map((l) => l.stream)).toEqual(['stderr', 'stderr'])
  })

  it('applies the overridable accepts() policy', () => {
    class WarnsOnly extends CaptureLogger {
      protected override accepts(r: LogRecord): boolean {
        return LogLevelUtils.gte(r.level, 'warn')
      }
    }
    const log = new WarnsOnly()
    log.debug('nope')
    log.info('nope')
    log.warn('yes')
    expect(log.lines).toHaveLength(1)
    expect(log.lines[0]?.line).toContain('yes')
  })

  it('applies the overridable format() interceptor', () => {
    class JsonLogger extends CaptureLogger {
      protected override format(r: LogRecord): string {
        return LogFormatUtils.json(r)
      }
    }
    const log = new JsonLogger()
    log.info('structured')
    expect(() => JSON.parse(log.lines[0]?.line ?? '')).not.toThrow()
  })

  it('dispatches to planted trees after the console default', async () => {
    const log = new CaptureLogger()
    const seen: LogRecord[] = []
    log.tree((r) => {
      seen.push(r)
    })
    log.info('x')
    await log.flush()
    expect(seen).toHaveLength(1)
    expect(seen[0]?.message).toBe('x')
    expect(log.lines).toHaveLength(1) // console default still fired
  })

  it('flush() awaits in-flight asynchronous tree writes', async () => {
    const log = new CaptureLogger()
    let done = false
    log.tree(async () => {
      await new Promise((r) => setTimeout(r, 10))
      done = true
    })
    log.info('x')
    await log.flush()
    expect(done).toBe(true)
  })

  it('does not dispatch dropped records to trees', async () => {
    class WarnsOnly extends CaptureLogger {
      protected override accepts(r: LogRecord): boolean {
        return LogLevelUtils.gte(r.level, 'warn')
      }
    }
    const log = new WarnsOnly()
    const seen: LogRecord[] = []
    log.tree((r) => {
      seen.push(r)
    })
    log.info('dropped')
    await log.flush()
    expect(seen).toHaveLength(0)
  })
})
