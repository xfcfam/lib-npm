import { Business } from '@xfcfam/xf'
import type { LogRecord } from '../../repository/transfers/LogRecord.js'
import type { LoggerRepository } from '../../repository/general/LoggerRepository.js'
import { LogFormatUtils } from '../../repository/utils/LogFormatUtils.js'

/**
 * Business-Layer Generalization — the base **"tree"**: a planted handler
 * that carries the *policy* of a log sink (formatting, level filtering,
 * rotation, flushing). Named after Timber's `Tree`.
 *
 * Why Business? Rotation, multiplexing, dynamic filenames and level
 * routing are *decisions* — effective logic about how output is shaped —
 * not raw I/O. The model puts decisions in Business and keeps the I/O in
 * Access. A tree therefore **plants itself into `R.logger`** (Business → R
 * descending) in `init()`, and `LoggerRepository` invokes it as an opaque
 * {@link LogHandler}; the I/O each tree performs is delegated **back down**
 * to an Access component (the logger's console primitive, or an
 * `@xfcfam/xf-fs` `FileRepository`).
 *
 * Concrete trees implement {@link write} (where the line goes) and wire
 * {@link logger} to their `R.logger`. The template {@link handle} runs the
 * overridable operations in order:
 *
 * ```text
 * accepts(record)  →  shouldRotate(record) ? rotate()  →
 * write(format(record), record)  →  shouldFlush(record) ? flush()
 * ```
 *
 * @typeParam S  Operative state of the sink (e.g. a file tree's current
 *               day / rotation index). Defaults to `null` for stateless
 *               trees.
 */
export abstract class LoggerBusiness<S = null> extends Business<S> {
  /**
   * Per-tree serialisation queue (operative; keyed by instance to avoid a
   * mutable field on the Generalization). A fast emit loop dispatches
   * records concurrently, but a sink's writes — and especially its
   * rotation size checks — must run one at a time and in order.
   */
  private static readonly queues = new WeakMap<object, Promise<void>>()

  /**
   * The Access logger this tree plants into. Wire it to your injection:
   * `protected logger() { return R.logger }`.
   */
  protected abstract logger(): LoggerRepository

  /**
   * Emit one already-formatted line to this tree's sink. Implemented by
   * the concrete tree — delegating the actual I/O to an Access component
   * (never touching `fs` / `stdout` directly from Business).
   */
  protected abstract write(line: string, record: LogRecord): void | Promise<void>

  /** Plant this tree into `R.logger`. */
  async init(): Promise<void> {
    this.logger().tree((record) => this.handle(record))
  }

  /** Lifecycle stop hook; trees hold no resources to release by default. */
  async terminate(): Promise<void> {}

  /**
   * Process one record through this tree's policy. Invoked by
   * `LoggerRepository` for every accepted record, after the console
   * default.
   */
  async handle(record: LogRecord): Promise<void> {
    const prev = LoggerBusiness.queues.get(this) ?? Promise.resolve()
    const next = prev.then(
      () => this.process(record),
      () => this.process(record),
    )
    LoggerBusiness.queues.set(this, next)
    await next
  }

  /** The serialised body of {@link handle} for a single record. */
  private async process(record: LogRecord): Promise<void> {
    if (!this.accepts(record)) return
    if (await this.shouldRotate(record)) await this.rotate()
    await this.write(this.format(record), record)
    if (this.shouldFlush(record)) await this.flush()
  }

  // ─── Overridable operations ────────────────────────────────

  /** Formatter interceptor for this tree's output. Override to homogenise. */
  protected format(record: LogRecord): string {
    return LogFormatUtils.text(record)
  }

  /** Per-tree policy gate (e.g. "this sink only takes errors"). */
  protected accepts(_record: LogRecord): boolean {
    return true
  }

  /** Whether to rotate before writing this record. Default: never. */
  protected shouldRotate(_record: LogRecord): boolean | Promise<boolean> {
    return false
  }

  /** Whether to flush after writing this record. Default: never. */
  protected shouldFlush(_record: LogRecord): boolean {
    return false
  }

  // ─── Overridable sink lifecycle ────────────────────────────

  /** Perform a rotation. Default: no-op (only stateful sinks rotate). */
  protected rotate(): void | Promise<void> {}

  /** Flush buffered output. Default: no-op (most sinks write through). */
  protected flush(): void | Promise<void> {}
}
