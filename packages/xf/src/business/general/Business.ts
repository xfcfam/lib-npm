/**
 * Base Generalization for the Business Layer (7.2).
 *
 * `Business<T>` is the canonical XF Generalization that every concrete
 * Logical component of the Business Layer extends. It carries the
 * domain-local state of the component and declares the mandatory
 * lifecycle hooks (`init` / `terminate`) that the injection `B`
 * orchestrates.
 *
 * The Business Layer holds the domain rules and invariants of the
 * artefact. A Business component MUST be technology-agnostic — it MUST
 * NOT know about HTTP, SQL, UI frameworks, or any specific protocol.
 *
 * @typeParam T  Shape of the component's internal domain state. Use
 *               `null` (and extend {@link StatelessBusiness}) when the
 *               component carries no state.
 *
 * @example
 * ```ts
 * import { Business } from '@xfcfam/xf'
 *
 * interface SessionState { userId?: string; lastSeen: number }
 *
 * export class SessionBusiness extends Business<SessionState> {
 *   constructor() { super({ lastSeen: 0 }) }
 *   async init()      {}
 *   async terminate() {}
 *   touch() { this.state.lastSeen = Date.now() }
 * }
 * ```
 */
export abstract class Business<T> {
  /** Domain-local state. Protected — accessible only to subclasses. */
  protected state: T

  /**
   * @param state  Initial state for the component.
   */
  constructor(state: T) {
    this.state = state
  }

  /**
   * Wire dependencies / load initial state. Invoked once on bootstrap.
   *
   * @returns A promise that resolves once the component is ready.
   */
  abstract init(): Promise<void>

  /**
   * Release resources / persist final state. Invoked once on shutdown.
   *
   * @returns A promise that resolves once the component has shut down.
   */
  abstract terminate(): Promise<void>
}
