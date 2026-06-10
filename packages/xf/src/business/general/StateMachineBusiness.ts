import { Business } from './Business.js'
import { IllegalTransitionException } from '../transfers/IllegalTransitionException.js'

/**
 * Transition table type. Maps each source state to a partial map of
 * events to target states.
 *
 * @typeParam S  Set of FSM states.
 * @typeParam E  Set of FSM events.
 */
export type TransitionTable<S extends string, E extends string> = Readonly<
  Record<S, Readonly<Partial<Record<E, S>>>>
>

/**
 * Generalization for Business Layer components whose domain entity has
 * a finite-state lifecycle — sessions, orders, payments, sagas, etc.
 *
 * The concrete component:
 *
 * - declares its allowed transitions in {@link transitions};
 * - implements {@link getFsmState} / {@link setFsmState} as the bridge
 *   between the FSM state and however it is encoded in `T`.
 *
 * The base class exposes:
 *
 * - {@link currentState} — convenience getter;
 * - {@link canTransition} — predicate;
 * - {@link transition} — mutator that throws on illegal transitions.
 *
 * Extension point: subclasses may override the protected hook
 * {@link onTransition} to react after every successful transition
 * without overriding {@link transition} itself. This is what
 * {@link ObservableStateMachineBusiness} uses internally.
 *
 * @typeParam T  Shape of the component's internal domain state.
 * @typeParam S  Union of legal FSM states (string literals).
 * @typeParam E  Union of legal FSM events (string literals).
 *
 * @example
 * ```ts
 * import { StateMachineBusiness, TransitionTable } from '@xfcfam/xf'
 *
 * type Status = 'draft' | 'submitted' | 'approved' | 'rejected'
 * type Action = 'submit' | 'approve' | 'reject' | 'revise'
 *
 * interface OrderState { status: Status; total: number }
 *
 * export class OrderBusiness extends StateMachineBusiness<OrderState, Status, Action> {
 *   constructor() { super({ status: 'draft', total: 0 }) }
 *   async init()      {}
 *   async terminate() {}
 *
 *   protected readonly transitions: TransitionTable<Status, Action> = {
 *     draft:     { submit: 'submitted' },
 *     submitted: { approve: 'approved', reject: 'rejected' },
 *     approved:  {},
 *     rejected:  { revise: 'draft' },
 *   }
 *
 *   protected getFsmState() { return this.state.status }
 *   protected setFsmState(s: Status) { this.state = { ...this.state, status: s } }
 * }
 * ```
 */
export abstract class StateMachineBusiness<
  T,
  S extends string,
  E extends string
> extends Business<T> {
  /**
   * Subclass declares the allowed transitions.
   */
  protected abstract readonly transitions: TransitionTable<S, E>

  /**
   * Read the FSM state out of `T`.
   *
   * @returns The current FSM state encoded in `this.state`.
   */
  protected abstract getFsmState(): S

  /**
   * Write the FSM state back into `T` (typically a state-spreading update).
   *
   * @param state  The new FSM state to encode into `this.state`.
   */
  protected abstract setFsmState(state: S): void

  /**
   * Hook invoked after a successful transition. Default no-op.
   * Subclasses overriding this MUST keep it side-effect-only — do not
   * call {@link transition} from inside, or you will recurse.
   *
   * @param from   The state the FSM was in before the transition.
   * @param event  The event that triggered the transition.
   * @param to     The state the FSM is now in.
   */
  protected onTransition(_from: S, _event: E, _to: S): void {}

  /**
   * Current FSM state.
   *
   * @returns The current FSM state.
   */
  get currentState(): S {
    return this.getFsmState()
  }

  /**
   * Whether `event` is legal from the current state.
   *
   * @param event  The event to test.
   * @returns      `true` if the transition is declared in {@link transitions}.
   */
  canTransition(event: E): boolean {
    const from = this.getFsmState()
    return this.transitions[from]?.[event] !== undefined
  }

  /**
   * Apply `event` and move the FSM to the target state.
   *
   * @param event  The event to apply.
   * @returns      The new FSM state.
   * @throws IllegalTransitionException if the transition is not declared in {@link transitions}.
   */
  transition(event: E): S {
    const from = this.getFsmState()
    const to = this.transitions[from]?.[event]
    if (to === undefined) {
      throw new IllegalTransitionException(`Illegal transition: ${from} -[${event}]-> ?`)
    }
    this.setFsmState(to)
    this.onTransition(from, event, to)
    return to
  }
}
