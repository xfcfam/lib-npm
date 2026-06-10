import { ScheduleBusiness } from './ScheduleBusiness.js'

/**
 * Reason the flush was triggered, surfaced to the {@link
 * BatchedBusiness.onFlushStart} hook so subclasses can log/branch on
 * it.
 */
export type BatchFlushReason = 'size' | 'time' | 'manual' | 'terminate'

/**
 * Policy for items in a batch whose flush callback rejected.
 *
 * - `lose`: the failed batch is dropped; subclasses that want to
 *   retry must reintroduce items from the {@link
 *   BatchedBusiness.onFlushError} hook.
 * - `retain`: the failed batch is prepended back into the buffer so
 *   the next flush retries it. Useful for transient errors; risks
 *   tight failure loops if the error is permanent.
 */
export type BatchErrorPolicy = 'lose' | 'retain'

/**
 * Configuration accepted by {@link BatchedBusiness}'s constructor.
 *
 * At least one of `maxSize` / `maxAgeMs` should be set, otherwise the
 * buffer only flushes on manual `flush()` calls or on `terminate()`.
 */
export interface BatchOptions<T> {
  /**
   * Flush automatically when the buffer reaches this many items.
   * Undefined disables size-triggered flush.
   */
  readonly maxSize?: number
  /**
   * Flush automatically every `maxAgeMs` milliseconds. Undefined
   * disables the timer.
   */
  readonly maxAgeMs?: number
  /** What to do with items whose flush rejected. Default `'lose'`. */
  readonly onErrorPolicy?: BatchErrorPolicy
  /**
   * The actual flush operation. Receives an immutable snapshot of the
   * batch and must not throw on partial success — either complete the
   * whole batch or reject the whole call.
   */
  readonly flush: (batch: readonly T[]) => Promise<void>
}

interface BatchState<T> {
  readonly options: BatchOptions<T>
  readonly buffer: T[]
  flushing: boolean
}

/**
 * Generalization for Business Layer components that accumulate
 * operations in memory and flush them in batches — to coalesce DB
 * writes, HTTP requests, log emissions, file appends, or any
 * operation that benefits from batching.
 *
 * Subclass with the item type `T` and supply a `flush` callback that
 * applies the batch. The base class handles buffering, size-based
 * triggers, time-based triggers (via the underlying
 * {@link ScheduleBusiness}), and the configured error policy.
 *
 * Two coordination semantics worth knowing:
 *
 * - The flush callback is **never invoked concurrently**: if a flush
 *   is in flight, `add()` will buffer normally but new triggers wait
 *   until the in-flight flush settles.
 * - `terminate()` performs one final flush (reason `'terminate'`) so
 *   pending items are not silently lost on shutdown.
 *
 * @example
 * ```ts
 * import { BatchedBusiness } from '@xfcfam/xf'
 * import { R } from '../R.js'
 *
 * interface AuditEvent { actor: string; action: string; at: Date }
 *
 * export class AuditBatchBusiness extends BatchedBusiness<AuditEvent> {
 *   constructor() {
 *     super({
 *       maxSize: 100,
 *       maxAgeMs: 5_000,
 *       onErrorPolicy: 'retain',
 *       flush: batch => R.auditRepository.insertMany(batch),
 *     })
 *   }
 *
 *   record(event: AuditEvent): void { this.add(event) }
 * }
 * ```
 */
export abstract class BatchedBusiness<T> extends ScheduleBusiness<BatchState<T>> {
  constructor(options: BatchOptions<T>) {
    super({
      options: { onErrorPolicy: 'lose', ...options },
      buffer: [],
      flushing: false,
    })
  }

  /** Number of items currently waiting in the buffer. */
  get pendingCount(): number {
    return this.state.buffer.length
  }

  /**
   * Append an item to the buffer. May trigger an immediate flush if
   * the buffer reaches the configured `maxSize`.
   */
  add(item: T): void {
    this.state.buffer.push(item)
    this.onAdd(item, this.state.buffer.length)
    const max = this.state.options.maxSize
    if (max !== undefined && this.state.buffer.length >= max) {
      this.onBufferFull(this.state.buffer.length)
      void this.flush('size')
    }
  }

  /**
   * Flush all pending items now. No-op if the buffer is empty or a
   * flush is already in flight. Resolves after the flush settles.
   */
  async flush(reason: BatchFlushReason = 'manual'): Promise<void> {
    if (this.state.flushing) return
    if (this.state.buffer.length === 0) return
    this.state.flushing = true
    const batch: T[] = this.state.buffer.splice(0)
    const startedAt = Date.now()
    try {
      this.onFlushStart(batch, reason)
      await this.state.options.flush(batch)
      this.onFlushComplete(batch, Date.now() - startedAt)
    } catch (err) {
      if (this.state.options.onErrorPolicy === 'retain') {
        // Prepend so retries preserve original order.
        this.state.buffer.unshift(...batch)
      }
      this.onFlushError(batch, err)
    } finally {
      this.state.flushing = false
      if (this.state.buffer.length === 0) this.onDrain()
    }
  }

  /**
   * Discard every pending item without invoking the flush callback.
   * Emits {@link onClear} with the count dropped. Use to bail out of
   * a failed scenario where retrying the batch is pointless.
   */
  clear(): void {
    const dropped = this.state.buffer.length
    if (dropped === 0) return
    this.state.buffer.length = 0
    this.onClear(dropped)
    this.onDrain()
  }

  // ─── ScheduleBusiness wiring ──────────────────────────────

  /**
   * Invoked by the underlying timer. Translates the tick into a
   * time-reason flush when there are pending items.
   */
  override async run(): Promise<void> {
    if (this.state.buffer.length === 0) return
    this.onTimeout(this.state.options.maxAgeMs ?? 0)
    await this.flush('time')
  }

  override async init(): Promise<void> {
    const ms = this.state.options.maxAgeMs
    if (ms !== undefined && ms > 0) this.interval(ms)
  }

  override async terminate(): Promise<void> {
    // Cancel the timer first (super.terminate clears it), then drain
    // any remaining pending items in a final flush.
    await super.terminate()
    if (this.state.buffer.length > 0) await this.flush('terminate')
  }

  // ─── Overridable hooks ────────────────────────────────────

  protected onAdd(_item: T, _size: number): void {}
  protected onBufferFull(_size: number): void {}
  protected onTimeout(_ageMs: number): void {}
  protected onFlushStart(_batch: readonly T[], _reason: BatchFlushReason): void {}
  protected onFlushComplete(_batch: readonly T[], _durationMs: number): void {}
  protected onFlushError(_batch: readonly T[], _error: unknown): void {}
  protected onClear(_droppedCount: number): void {}
  protected onDrain(): void {}
}
