import { Repository } from './Repository.js'

/**
 * Callback registered through {@link ConnectableRepository.onConnect} or
 * {@link ConnectableRepository.onDisconnect}. May be synchronous or return a
 * promise; the component awaits it before invoking the next listener.
 */
export type ConnectionListener = () => void | Promise<void>

/**
 * Generalization for Access Layer components that hold a **connection** to an
 * external system — a database pool, a key-value store, a socket — and whose
 * consumers need to react when that connection becomes available.
 *
 * ──────────────────────────────────────────────────────────────────
 *  Why this exists — the late-subscriber trap
 * ──────────────────────────────────────────────────────────────────
 * XF bootstraps strictly downwards: `R.init()` completes before `B.init()`
 * runs. A Repository therefore connects **before** any Business exists to hear
 * about it. With a plain event emitter the Business subscribes to an event
 * that has already fired, its callback never runs, and the failure is silent:
 * no error, no log, just state that is never populated. The listener list
 * looks correct in every code review — it is the *ordering* that is wrong, and
 * ordering is invisible at the call site.
 *
 * This Generalization removes the race instead of documenting it. Connection
 * state is a **latch**, not an event: {@link onConnect} registered after the
 * connection is already up fires immediately. Subscribers get the same
 * behaviour whether they arrived early or late, so a component never has to
 * ask "has it connected yet?" — the question that, unasked, produces the bug.
 *
 * ──────────────────────────────────────────────────────────────────
 *  Contract for subclasses
 * ──────────────────────────────────────────────────────────────────
 * `init()` / `terminate()` stay abstract here on purpose: this class does not
 * take over the lifecycle, so there is no `super.init()` to forget. The
 * subclass owns its connection and announces transitions:
 *
 *   async init()      { await this.open();  await this.markConnected()    }
 *   async terminate() { await this.markDisconnected(); await this.close() }
 *
 * Both marks are idempotent — marking a state that is already current is a
 * no-op — so a reconnect loop can call them freely.
 *
 * Listener failures are isolated: one throwing listener never aborts the
 * remaining ones nor the transition itself. Override {@link onListenerError}
 * to log them; the default swallows, matching the rest of the framework's
 * observer semantics.
 *
 * @typeParam T  Shape of the component's internal state. Use `null` when the
 *               component keeps its connection elsewhere.
 *
 * @example
 * ```ts
 * import { ConnectableRepository } from '@xfcfam/xf'
 *
 * export class CacheRepository extends ConnectableRepository<null> {
 *   constructor() { super(null) }
 *   async init()      { await this.client.connect();    await this.markConnected()    }
 *   async terminate() { await this.markDisconnected();  await this.client.quit()      }
 * }
 *
 * // In B.init(), long after R.init() has finished — still fires:
 * R.cache.onConnect(() => this.interval(5 * 60_000, true))
 * ```
 */
export abstract class ConnectableRepository<T> extends Repository<T> {
  private nextId = 0
  private readonly connectListeners = new Map<number, ConnectionListener>()
  private readonly disconnectListeners = new Map<number, ConnectionListener>()
  private connected = false

  /** Whether the component currently holds a live connection. */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Register a listener for the moment the connection becomes available.
   *
   * If the component is **already connected**, the listener runs immediately
   * (fire-and-forget — the registration itself is synchronous, so a rejected
   * promise is routed to {@link onListenerError} rather than to the caller).
   * It runs again on every subsequent reconnect.
   *
   * @param listener  Callback invoked once per connect transition.
   * @returns         An id usable in {@link remove}.
   */
  onConnect(listener: ConnectionListener): number {
    const id = ++this.nextId
    this.connectListeners.set(id, listener)
    if (this.connected) void this.invoke(listener)
    return id
  }

  /**
   * Register a listener for the moment the connection is lost.
   *
   * Unlike {@link onConnect} this does not replay: a listener registered while
   * the component is disconnected is not invoked until the next disconnect
   * transition. Losing a connection you never had is not an event.
   *
   * @param listener  Callback invoked once per disconnect transition.
   * @returns         An id usable in {@link remove}.
   */
  onDisconnect(listener: ConnectionListener): number {
    const id = ++this.nextId
    this.disconnectListeners.set(id, listener)
    return id
  }

  /**
   * Unregister a listener.
   *
   * @param id  The id previously returned by {@link onConnect} / {@link onDisconnect}.
   */
  remove(id: number): void {
    this.connectListeners.delete(id)
    this.disconnectListeners.delete(id)
  }

  /** Drop every registered listener. Typically called from `terminate()`. */
  protected clearConnectionListeners(): void {
    this.connectListeners.clear()
    this.disconnectListeners.clear()
  }

  /**
   * Announce that the connection is up. Idempotent: a second call while
   * already connected does nothing. Listeners run sequentially, in
   * registration order, each awaited.
   */
  protected async markConnected(): Promise<void> {
    if (this.connected) return
    this.connected = true
    for (const listener of [...this.connectListeners.values()]) await this.invoke(listener)
  }

  /**
   * Announce that the connection is gone. Idempotent: a call while already
   * disconnected does nothing.
   */
  protected async markDisconnected(): Promise<void> {
    if (!this.connected) return
    this.connected = false
    for (const listener of [...this.disconnectListeners.values()]) await this.invoke(listener)
  }

  /**
   * Hook invoked when a listener throws or rejects. Default is a no-op —
   * listener errors are isolated so one bad subscriber cannot break the
   * transition for the others. Override to log.
   *
   * @param error  The failure raised by the listener.
   */
  protected onListenerError(error: unknown): void {}

  private async invoke(listener: ConnectionListener): Promise<void> {
    try {
      await listener()
    } catch (error) {
      this.onListenerError(error)
    }
  }
}
