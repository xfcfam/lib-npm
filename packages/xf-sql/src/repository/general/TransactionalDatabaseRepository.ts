import { type Transaction } from 'kysely'
import { DatabaseRepository } from './DatabaseRepository.js'

/**
 * Generalization for SQL Access Layer components that need explicit
 * transaction control on top of {@link DatabaseRepository}.
 *
 * Extends `DatabaseRepository<Schema>` and adds {@link transaction},
 * a helper that runs a callback inside a Kysely transaction:
 * commits on success, rolls back on throw.
 *
 * Error translation flows through {@link DatabaseRepository.translateError}
 * — overriding it once on a dialect subclass covers both `exec` and
 * `transaction`.
 *
 * ──────────────────────────────────────────────────────────────────
 *  Overridable transaction hooks
 * ──────────────────────────────────────────────────────────────────
 *  - {@link onTransactionStart}    ← before the callback runs
 *  - {@link onTransactionCommit}   ← after the callback resolves
 *  - {@link onTransactionRollback} ← when the callback throws
 *
 * Each hook receives a `txId` — a short opaque identifier that
 * correlates the three events of the same transaction. The id is
 * generated per-call and has no meaning to the database (it's a
 * sibling of telemetry trace ids, not of SQL `SAVEPOINT` names).
 *
 * @typeParam Schema  See {@link DatabaseRepository}.
 *
 * @example
 * ```ts
 * import { TransactionalDatabaseRepository } from '@xfcfam/xf-sql'
 *
 * export class OrdersDb extends TransactionalDatabaseRepository<Schema> {
 *   constructor() { super({ dialect: ... }) }
 *   async init()      { await super.init() }
 *   async terminate() { await super.terminate() }
 *
 *   async checkout(order: Order) {
 *     return this.transaction(async (trx) => {
 *       await trx.insertInto('orders').values(order).execute()
 *       await trx.updateTable('inventory')
 *         .set((eb) => ({ stock: eb('stock', '-', order.qty) }))
 *         .where('sku', '=', order.sku)
 *         .execute()
 *       return order.id
 *     })
 *   }
 * }
 * ```
 */
export abstract class TransactionalDatabaseRepository<Schema = unknown>
  extends DatabaseRepository<Schema>
{
  /**
   * Run `callback` inside a database transaction. Commits if the
   * callback resolves; rolls back if it throws.
   *
   * The argument passed to `callback` is a `Transaction<Schema>` —
   * a Kysely-typed transaction handle. Use it (not `this.db`) for
   * queries inside the transaction so they participate in the same
   * unit of work.
   *
   * Errors thrown inside the callback are translated through
   * {@link DatabaseRepository.translateError} before being rethrown.
   */
  protected async transaction<R>(
    callback: (trx: Transaction<Schema>) => Promise<R>,
  ): Promise<R> {
    const txId = TransactionalDatabaseRepository.makeTxId()
    const startedAt = Date.now()
    this.onTransactionStart(txId)
    try {
      const result = await this.db.transaction().execute(callback)
      this.onTransactionCommit(txId, Date.now() - startedAt)
      return result
    } catch (err) {
      try {
        await this.onTransactionRollback(txId, err)
      } catch {
        // A throwing rollback hook must not mask the original error.
      }
      throw this.translateError(err)
    }
  }

  // ─── Overridable transaction hooks ────────────────────────

  /**
   * Invoked just before the transaction callback runs. Default no-op.
   * `txId` is a short opaque identifier that correlates the three
   * events of the same transaction.
   */
  protected onTransactionStart(_txId: string): void {}

  /**
   * Invoked after the transaction callback resolves successfully and
   * the commit completes. `durationMs` measures the full lifetime of
   * the transaction (including commit latency). Default no-op.
   */
  protected onTransactionCommit(_txId: string, _durationMs: number): void {}

  /**
   * Invoked when the transaction callback throws and the rollback
   * completes. `reason` is the original error (before
   * {@link DatabaseRepository.translateError} is applied to the
   * rethrow). Default no-op.
   *
   * The hook may be `async` — it is `await`ed before the original
   * error is rethrown. If the hook itself throws, the exception is
   * swallowed so the original transaction error is always the one
   * propagated to the caller.
   */
  protected onTransactionRollback(_txId: string, _reason: unknown): void | Promise<void> {}

  // ─── Internals ────────────────────────────────────────────

  private static makeTxId(): string {
    const t = Date.now().toString(36)
    const r = Math.floor(Math.random() * 0x100000).toString(36).padStart(4, '0')
    return `tx-${t}-${r}`
  }
}
