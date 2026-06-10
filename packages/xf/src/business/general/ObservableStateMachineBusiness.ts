import { StateMachineBusiness } from './StateMachineBusiness.js'

/**
 * Generalization combining a finite-state machine with observation.
 * Subclasses provide the same configuration as
 * {@link StateMachineBusiness} ({@link StateMachineBusiness.transitions},
 * {@link StateMachineBusiness.getFsmState},
 * {@link StateMachineBusiness.setFsmState}) and gain two parallel
 * observation surfaces:
 *
 * - **Whole-state**: {@link observe} / {@link remove}. Observer is
 *   called with the current `T` after every successful transition.
 *   Use {@link notify} to fire these manually on out-of-band changes.
 * - **Transition**: {@link observeTransition} / {@link removeTransition}.
 *   Observer is called with `(from, event, to)` after every successful
 *   transition.
 *
 * Transition observers do NOT fire on manual {@link notify} calls —
 * only on actual transitions through {@link transition}.
 *
 * @typeParam T  Shape of the component's internal domain state.
 * @typeParam S  Union of legal FSM states (string literals).
 * @typeParam E  Union of legal FSM events (string literals).
 *
 * @example
 * ```ts
 * import { ObservableStateMachineBusiness, TransitionTable } from '@xfcfam/xf'
 *
 * type Status = 'draft' | 'submitted' | 'approved'
 * type Action = 'submit' | 'approve'
 *
 * interface OrderState { status: Status; total: number }
 *
 * export class OrderBusiness extends ObservableStateMachineBusiness<OrderState, Status, Action> {
 *   constructor() { super({ status: 'draft', total: 0 }) }
 *
 *   protected readonly transitions: TransitionTable<Status, Action> = {
 *     draft:     { submit: 'submitted' },
 *     submitted: { approve: 'approved' },
 *     approved:  {},
 *   }
 *   protected getFsmState() { return this.state.status }
 *   protected setFsmState(s: Status) { this.state = { ...this.state, status: s } }
 * }
 *
 * orderBiz.observe(state => render(state))
 * orderBiz.observeTransition((from, event, to) => log(`${from} -[${event}]-> ${to}`))
 * orderBiz.transition('submit')   // → both observers fire
 * ```
 */
export abstract class ObservableStateMachineBusiness<
  T,
  S extends string,
  E extends string
> extends StateMachineBusiness<T, S, E> {
  private nextStateObserverId = 0
  private stateObservers = new Map<number, (state: T) => void>()

  private nextTransitionObserverId = 0
  private transitionObservers = new Map<number, (from: S, event: E, to: S) => void>()

  /**
   * Register a whole-state observer.
   *
   * @param observer  Callback invoked with the current state after every
   *                  successful transition (and on manual {@link notify}).
   * @returns         An id usable in {@link remove}.
   */
  observe(observer: (state: T) => void): number {
    const id = ++this.nextStateObserverId
    this.stateObservers.set(id, observer)
    return id
  }

  /**
   * Unregister a whole-state observer.
   *
   * @param id  The id previously returned by {@link observe}.
   */
  remove(id: number): void {
    this.stateObservers.delete(id)
  }

  /**
   * Register a transition observer.
   *
   * @param observer  Callback invoked with `(from, event, to)` after every
   *                  successful transition. Does NOT fire on manual {@link notify}.
   * @returns         An id usable in {@link removeTransition}.
   */
  observeTransition(observer: (from: S, event: E, to: S) => void): number {
    const id = ++this.nextTransitionObserverId
    this.transitionObservers.set(id, observer)
    return id
  }

  /**
   * Unregister a transition observer.
   *
   * @param id  The id previously returned by {@link observeTransition}.
   */
  removeTransition(id: number): void {
    this.transitionObservers.delete(id)
  }

  /**
   * Invoke every whole-state observer with the current state.
   * Called automatically after each successful transition; call
   * manually when `this.state` changes outside of a transition.
   * Does NOT fire transition observers.
   */
  notify(): void {
    this.stateObservers.forEach(observer => observer(this.state))
  }

  /**
   * Bridge: every successful transition fans out to both observer pools.
   *
   * @param from   The state the FSM was in before the transition.
   * @param event  The event that triggered the transition.
   * @param to     The state the FSM is now in.
   */
  protected override onTransition(from: S, event: E, to: S): void {
    this.transitionObservers.forEach(cb => cb(from, event, to))
    this.notify()
  }

  /**
   * No-op. Override to add setup.
   */
  async init(): Promise<void> {}

  /**
   * Drops both observer pools.
   */
  async terminate(): Promise<void> {
    this.stateObservers.clear()
    this.transitionObservers.clear()
  }
}
