/**
 * Base Generalization for the Interaction Layer (7.3).
 *
 * `View<T>` is the canonical XF Generalization for GUI / presentation
 * Logical components of the Interaction Layer (the `View` suffix). It
 * carries the local presentation/orchestration state and declares the
 * mandatory lifecycle hooks (`init` / `terminate`) that the injection
 * `A` orchestrates.
 *
 * The Interaction Layer owns the entry points of the artefact. A View
 * component orchestrates Business operations on behalf of an external
 * caller; it MUST NOT access the Access Layer directly.
 *
 * The Interaction Layer has two canonical suffixes: `View` (GUI /
 * presentation) extends this class, while non-graphical, systemic
 * components (`Service`) extend its sibling {@link Service} (or
 * {@link StatelessService}) — structurally identical, semantically
 * distinct.
 *
 * @typeParam T  Shape of the component's internal state. Use `null` (and
 *               extend {@link StatelessView}) when the component carries
 *               no state.
 *
 * @example
 * ```ts
 * import { View } from '@xfcfam/xf'
 *
 * interface MainViewState { selectedTab: string }
 *
 * export class MainView extends View<MainViewState> {
 *   constructor() { super({ selectedTab: 'home' }) }
 *   async init()      { this.render() }
 *   async terminate() {}
 *   private render() { ... }
 * }
 * ```
 */
export abstract class View<T> {
  /** Local interaction state. Protected — accessible only to subclasses. */
  protected state: T

  /**
   * @param state  Initial state for the component.
   */
  constructor(state: T) {
    this.state = state
  }

  /**
   * Acquire UI resources / mount the view. Invoked once on bootstrap.
   *
   * @returns A promise that resolves once the component is ready.
   */
  abstract init(): Promise<void>

  /**
   * Release UI resources / unmount the view. Invoked once on shutdown.
   *
   * @returns A promise that resolves once the component has shut down.
   */
  abstract terminate(): Promise<void>
}
