import type { LogRecord } from '../../repository/transfers/LogRecord.js'
import type { LogLevel } from '../../repository/transfers/LogLevel.js'
import { LoggerBusiness } from './LoggerBusiness.js'
import { LogLevelUtils } from '../../repository/utils/LogLevelUtils.js'

/**
 * Business-Layer Generalization — a built-in **console tree**.
 *
 * `LoggerRepository` already writes a console default, so a console tree
 * is only needed when you want a **second, independently-configured**
 * console stream — its own `format` (e.g. JSON) or its own `accepts`
 * policy (e.g. audit-only) — alongside the default.
 *
 * Stateless (no rotation, no buffering) and **dependency-free** — it
 * routes its output back through the Access logger's `writeConsole`
 * primitive, so it needs no `@xfcfam/xf-fs`. Extend it and wire
 * {@link logger} to your `R.logger`.
 *
 * @example
 * ```ts
 * export class AuditConsoleTreeBusiness extends ConsoleTreeBusiness {
 *   protected logger() { return R.logger }
 *   protected override accepts(r: LogRecord) { return r.fields?.audit === true }
 *   protected override format(r: LogRecord) { return LogFormatUtils.json(r) }
 * }
 * ```
 */
export abstract class ConsoleTreeBusiness extends LoggerBusiness<null> {
  constructor() {
    super(null)
  }

  /** Route the formatted line to the console via the Access logger. */
  protected write(line: string, record: LogRecord): void {
    this.logger().writeConsole(line, this.streamFor(record.level))
  }

  /** Warns-and-above to stderr, the rest to stdout. Override to change. */
  protected streamFor(level: LogLevel): 'stdout' | 'stderr' {
    return LogLevelUtils.gte(level, 'warn') ? 'stderr' : 'stdout'
  }
}
