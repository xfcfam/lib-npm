import { Business } from './Business.js'

/**
 * Result of a domain invariant check. Either the candidate state is
 * accepted (and may be transformed during validation, e.g. normalised),
 * or it is rejected with a domain error.
 */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error }

/**
 * Generalization for Business Layer components that must enforce a
 * single domain invariant gate on every state transition.
 *
 * The concrete component implements {@link validate}, which inspects a
 * candidate next state and returns either an accepted (possibly
 * normalised) value or a domain error. The base class exposes
 * {@link commit}: a safe mutator that runs validation, throws on
 * rejection, and updates `state` on acceptance.
 *
 * Use this whenever the temptation arises to scatter `if (...) throw`
 * checks across multiple public methods of a Business component.
 *
 * @typeParam T  Shape of the component's internal domain state.
 *
 * @example
 * ```ts
 * import { ValidatedBusiness, ValidationResult } from '@xfcfam/xf'
 *
 * interface Account { balance: number }
 *
 * export class AccountBusiness extends ValidatedBusiness<Account> {
 *   constructor() { super({ balance: 0 }) }
 *   async init()      {}
 *   async terminate() {}
 *
 *   protected validate(next: Account): ValidationResult<Account> {
 *     return next.balance < 0
 *       ? { ok: false, error: new Error('balance cannot be negative') }
 *       : { ok: true, value: next }
 *   }
 *
 *   debit(amount: number) {
 *     this.commit({ balance: this.state.balance - amount })
 *   }
 * }
 * ```
 */
export abstract class ValidatedBusiness<T> extends Business<T> {
  /**
   * Inspect a candidate next state.
   *
   * @param next  The candidate next state.
   * @returns     `{ ok: true, value }` to accept (`value` becomes the new state,
   *              typically `next` possibly normalised), or `{ ok: false, error }`
   *              to reject (the error is thrown by {@link commit}).
   */
  protected abstract validate(next: T): ValidationResult<T>

  /**
   * Atomically validate and apply a candidate next state.
   *
   * @param next  The candidate next state.
   * @throws Error returned by {@link validate} when the candidate is rejected.
   *               `state` is left untouched in that case.
   */
  protected commit(next: T): void {
    const result = this.validate(next)
    if (!result.ok) throw result.error
    this.state = result.value
  }
}
