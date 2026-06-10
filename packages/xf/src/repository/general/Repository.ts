/**
 * Base Generalization for the Access Layer (7.1).
 *
 * `Repository<T>` is the canonical XF Generalization that every concrete
 * Logical component of the Access Layer extends. It carries the layer-local
 * state of the component and declares the mandatory lifecycle hooks
 * (`init` / `terminate`) that the injection `R` orchestrates.
 *
 * The Access Layer is responsible for communication with external systems
 * (databases, REST/GraphQL clients, file systems, hardware). A Repository
 * MUST contain only protocol- and I/O-level concerns; it MUST NOT contain
 * business rules.
 *
 * @typeParam T  Shape of the component's internal state. Use `null` (and
 *               extend {@link StatelessRepository}) when the component
 *               carries no state.
 *
 * @example
 * ```ts
 * import { Repository } from '@xfcfam/xf'
 * import { User } from '../transfers/User.js'
 *
 * interface UserRepoState { connection: DbClient }
 *
 * export class UserRepository extends Repository<UserRepoState> {
 *   constructor(client: DbClient) { super({ connection: client }) }
 *   async init()      { await this.state.connection.connect() }
 *   async terminate() { await this.state.connection.disconnect() }
 *   async fetch(id: string): Promise<User> {
 *     return this.state.connection.query('SELECT * FROM users WHERE id = ?', id)
 *   }
 * }
 * ```
 */
export abstract class Repository<T> {
  /** Layer-local state. Protected — accessible only to subclasses. */
  protected state: T

  /**
   * @param state  Initial state for the component.
   */
  constructor(state: T) {
    this.state = state
  }

  /**
   * Acquire resources (connections, buffers, etc.). Invoked once on
   * bootstrap, before the first operation.
   *
   * @returns A promise that resolves once the component is ready.
   */
  abstract init(): Promise<void>

  /**
   * Release resources (close connections, flush buffers, etc.). Invoked
   * once on shutdown, after the last operation.
   *
   * @returns A promise that resolves once the component has shut down.
   */
  abstract terminate(): Promise<void>
}
