/**
 * Business-layer Exception — a `StateMachineBusiness` was asked to
 * perform a transition that is not declared in its `transitions`
 * table.
 *
 * Surface from {@link StateMachineBusiness.transition} when the
 * `(state, event)` pair has no successor. The caller decides whether
 * to recover (typically by reporting an inconsistent state in the
 * UI) or to propagate.
 */
export class IllegalTransitionException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IllegalTransitionException'
  }
}
