import { Repository } from '@xfcfam/xf'
import type { LogLevel } from '../transfers/LogLevel.js'
import type { LogRecord } from '../transfers/LogRecord.js'
import type { LogHandler } from '../transfers/LogHandler.js'
import { LogFormatUtils } from '../utils/LogFormatUtils.js'
import { LogLevelUtils } from '../utils/LogLevelUtils.js'

/** Constructor options for a {@link LoggerRepository}. */
export interface LoggerOptions {
  /** Logger name / category, stamped onto every {@link LogRecord}. */
  readonly name?: string
}

/** Operative state held by a {@link LoggerRepository} (no domain state). */
interface LoggerState {
  /** Planted tree callbacks, run after the console default on every record. */
  readonly handlers: LogHandler[]
  /** In-flight asynchronous tree writes, awaited by {@link LoggerRepository.flush}. */
  readonly pending: Set<Promise<void>>
}

/**
 * Access-Layer Generalization — the **logging access point**, `R.logger`.
 *
 * Logging is the textbook cross-cutting capability: every layer needs it,
 * including Access itself. The model resolves this (§5.3) by placing the
 * capability in a **Logical of the lowest layer that needs it**, reached
 * **downward** through that layer's injection — so Business (`B → R`),
 * Interaction (`A → R`) and Access (same layer, via the injection, §5.7)
 * all call `R.logger.*` with no upward dependency.
 *
 * Responsibilities kept here, in Access:
 *
 *  1. **Emit API** — `trace/debug/info/warn/error/fatal` (+ `t/d/i/w/e/f`
 *     aliases and `log`). Each builds a {@link LogRecord}.
 *  2. **Policy gate** — the overridable `accepts(record)` decides what is
 *     logged at all ("only warns", "only errors", …).
 *  3. **Console default** — every accepted record is written to the
 *     console **first** (this is real I/O and belongs in Access),
 *     formatted by the overridable `format(record)`.
 *  4. **Registry + dispatch** — `tree(handler)` plants a Business "tree"
 *     ({@link LogHandler}); **then** every accepted record is dispatched
 *     to each planted tree. The registry holds opaque callbacks
 *     (Transfers), never the `LoggerBusiness` that produced them — so the
 *     multiplexing/rotation policy lives in Business with no upward edge.
 *
 * Concrete artefacts extend this (configuring `format` / `accepts`) and
 * register the subclass as `R.logger`.
 *
 * @example
 * ```ts
 * export class AppLoggerRepository extends LoggerRepository {
 *   constructor() { super({ name: 'app' }) }
 *   // policy: drop everything below WARN
 *   protected override accepts(r: LogRecord) { return LogLevelUtils.gte(r.level, 'warn') }
 *   // homogenise: structured JSON everywhere
 *   protected override format(r: LogRecord) { return LogFormatUtils.json(r) }
 * }
 * // R.logger.info('ready', { port: 8080 })
 * ```
 */
export abstract class LoggerRepository extends Repository<LoggerState> {
  /** Logger name stamped onto every record (operative; never domain state). */
  protected readonly loggerName: string | undefined

  constructor(options: LoggerOptions = {}) {
    super({ handlers: [], pending: new Set() })
    this.loggerName = options.name
  }

  /** Lifecycle start hook; no setup required by default. */
  async init(): Promise<void> {}

  /** Flush pending tree writes before shutdown. */
  async terminate(): Promise<void> {
    await this.flush()
  }

  // ─── Emit API ──────────────────────────────────────────────

  /** Emit at `trace`. */
  trace(message: string, fields?: Record<string, unknown>): void { this.log('trace', message, fields) }
  /** Emit at `debug`. */
  debug(message: string, fields?: Record<string, unknown>): void { this.log('debug', message, fields) }
  /** Emit at `info`. */
  info(message: string, fields?: Record<string, unknown>): void { this.log('info', message, fields) }
  /** Emit at `warn`. */
  warn(message: string, fields?: Record<string, unknown>): void { this.log('warn', message, fields) }
  /** Emit at `error`. */
  error(message: string, fields?: Record<string, unknown>): void { this.log('error', message, fields) }
  /** Emit at `fatal`. */
  fatal(message: string, fields?: Record<string, unknown>): void { this.log('fatal', message, fields) }

  /** Alias of {@link trace}. */
  t(message: string, fields?: Record<string, unknown>): void { this.log('trace', message, fields) }
  /** Alias of {@link debug}. */
  d(message: string, fields?: Record<string, unknown>): void { this.log('debug', message, fields) }
  /** Alias of {@link info}. */
  i(message: string, fields?: Record<string, unknown>): void { this.log('info', message, fields) }
  /** Alias of {@link warn}. */
  w(message: string, fields?: Record<string, unknown>): void { this.log('warn', message, fields) }
  /** Alias of {@link error}. */
  e(message: string, fields?: Record<string, unknown>): void { this.log('error', message, fields) }
  /** Alias of {@link fatal}. */
  f(message: string, fields?: Record<string, unknown>): void { this.log('fatal', message, fields) }

  /**
   * Emit at an explicit level. Builds the {@link LogRecord}, applies the
   * `accepts` policy, writes the console default, then dispatches to every
   * planted tree. Returns immediately — tree writes run in the background
   * and are awaited by {@link flush}.
   */
  log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
    const record: LogRecord = {
      level,
      message,
      timestamp: new Date(),
      ...(this.loggerName !== undefined ? { name: this.loggerName } : {}),
      ...(fields !== undefined ? { fields } : {}),
    }
    if (!this.accepts(record)) return
    this.onLog(record)
    // 1) console default — synchronous, immediate
    try {
      this.writeConsole(this.format(record), this.streamFor(level))
    } catch (err) {
      this.onError(err, record)
    }
    // 2) then each planted tree — asynchronous, tracked for flush()
    for (const handler of this.state.handlers) {
      this.track(this.runHandler(handler, record))
    }
  }

  // ─── Registry (plant a tree) ───────────────────────────────

  /**
   * Plant a tree: register a {@link LogHandler} that receives every
   * accepted record after the console default. Called by a
   * `LoggerBusiness` from its `init()` (`R.logger.tree(...)`, Business → R
   * descending).
   */
  tree(handler: LogHandler): void {
    this.state.handlers.push(handler)
  }

  // ─── Access console primitive ──────────────────────────────

  /**
   * Write one already-formatted line to the console. The single place the
   * console is touched — trees route their console output back through
   * here (`this.logger().writeConsole(...)`) so all stdout/stderr I/O
   * stays in this Access component.
   */
  writeConsole(line: string, stream: 'stdout' | 'stderr' = 'stdout'): void {
    const sink = stream === 'stderr' ? process.stderr : process.stdout
    sink.write(`${line}\n`)
  }

  // ─── Flush ─────────────────────────────────────────────────

  /** Await every in-flight tree write, then run the `onFlush` hook. */
  async flush(): Promise<void> {
    await Promise.all([...this.state.pending])
    await this.onFlush()
  }

  // ─── Overridable configuration operations ──────────────────

  /**
   * Formatter interceptor for the **console default**. Override to
   * homogenise output (e.g. delegate to {@link LogFormatUtils.json}).
   * Trees format their own output via their own `format(...)`.
   */
  protected format(record: LogRecord): string {
    return LogFormatUtils.text(record)
  }

  /**
   * Log policy: whether a record is emitted at all. Default accepts
   * everything. Override to filter (e.g. `LogLevelUtils.gte(r.level,
   * 'warn')` for warns-and-above, or `r.level === 'error'` for errors
   * only).
   */
  protected accepts(_record: LogRecord): boolean {
    return true
  }

  // ─── Overridable hooks ─────────────────────────────────────

  /** Called for every accepted record, before any output. Default no-op. */
  protected onLog(_record: LogRecord): void {}

  /** Called at the end of {@link flush}. Default no-op. */
  protected onFlush(): void | Promise<void> {}

  /**
   * Called when the console write or a tree handler throws. Logging is
   * best-effort, so the default reports to stderr and swallows rather than
   * letting a broken sink crash the program.
   */
  protected onError(err: unknown, _record: LogRecord): void {
    try {
      process.stderr.write(`[xf-logger] sink error: ${String(err)}\n`)
    } catch {
      /* last resort: nothing more we can safely do */
    }
  }

  // ─── Internals ─────────────────────────────────────────────

  /** Route warns-and-above to stderr, the rest to stdout. */
  protected streamFor(level: LogLevel): 'stdout' | 'stderr' {
    return LogLevelUtils.gte(level, 'warn') ? 'stderr' : 'stdout'
  }

  private async runHandler(handler: LogHandler, record: LogRecord): Promise<void> {
    try {
      await handler(record)
    } catch (err) {
      this.onError(err, record)
    }
  }

  private track(promise: Promise<void>): void {
    const pending = this.state.pending
    pending.add(promise)
    void promise.finally(() => pending.delete(promise))
  }
}
