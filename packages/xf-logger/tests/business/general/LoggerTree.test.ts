import { describe, it, expect } from 'vitest'
import {
  LoggerRepository,
  LoggerBusiness,
  ConsoleTreeBusiness,
  LogLevelUtils,
  type LogRecord,
} from '../../../index.js'

class CaptureLogger extends LoggerRepository {
  readonly lines: Array<{ line: string; stream: 'stdout' | 'stderr' }> = []
  override writeConsole(line: string, stream: 'stdout' | 'stderr' = 'stdout'): void {
    this.lines.push({ line, stream })
  }
}

/** A minimal tree that records the formatted lines it would emit. */
class ArrayTree extends LoggerBusiness<null> {
  readonly written: string[] = []
  constructor(private readonly log: CaptureLogger) {
    super(null)
  }
  protected logger(): LoggerRepository {
    return this.log
  }
  protected write(line: string): void {
    this.written.push(line)
  }
}

describe('LoggerBusiness (tree)', () => {
  it('plants itself and receives dispatched records through the template', async () => {
    const log = new CaptureLogger()
    const tree = new ArrayTree(log)
    await tree.init() // plants into R.logger
    log.info('hello')
    await log.flush()
    expect(tree.written).toHaveLength(1)
    expect(tree.written[0]).toContain('hello')
  })

  it('honours a per-tree accepts() policy', async () => {
    class ErrorsOnlyTree extends ArrayTree {
      protected override accepts(r: LogRecord): boolean {
        return LogLevelUtils.gte(r.level, 'error')
      }
    }
    const log = new CaptureLogger()
    const tree = new ErrorsOnlyTree(log)
    await tree.init()
    log.info('skip')
    log.error('keep')
    await log.flush()
    expect(tree.written).toHaveLength(1)
    expect(tree.written[0]).toContain('keep')
  })

  it('ConsoleTreeBusiness writes through the logger console primitive (default + tree)', async () => {
    class TestConsoleTree extends ConsoleTreeBusiness {
      constructor(private readonly log: CaptureLogger) {
        super()
      }
      protected logger(): LoggerRepository {
        return this.log
      }
    }
    const log = new CaptureLogger()
    const tree = new TestConsoleTree(log)
    await tree.init()
    log.info('twice')
    await log.flush()
    // one line from the console default, one from the planted console tree
    expect(log.lines).toHaveLength(2)
    expect(log.lines.every((l) => l.line.includes('twice'))).toBe(true)
  })
})
