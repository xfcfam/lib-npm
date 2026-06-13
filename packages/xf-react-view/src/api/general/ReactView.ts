/**
 * Mixin Generalization for GUI / presentation components of the
 * Interaction Layer (7.3) that must also extend a **peer-developer
 * class** — canonically `React.Component`.
 *
 * XF places every component under exactly one Generalization, and the
 * GUI Generalization of the Interaction Layer is `View` (the `View`
 * suffix; see `@xfcfam/xf`). TypeScript, however, is single-inheritance:
 * a component that already has to extend a class supplied by a peer
 * developer (a framework base such as `React.Component`) cannot *also*
 * `extends View<T>`. The XF directive for this case is the **Mixin
 * Generalization** — a class factory that grafts the Generalization onto
 * whatever base the peer developer mandates, so the component inherits
 * the actual Generalization surface without giving up its framework base.
 *
 * `ReactView(Base)` returns a class that:
 *
 * - **extends `Base` verbatim** — the peer constructor and every member
 *   (props, `state`, `setState`, `render`, …) are preserved and reachable
 *   through `super`;
 * - **implements the XF View lifecycle** ({@link ViewLifecycle}) —
 *   `init()` / `terminate()`, the two hooks the Interaction injection
 *   `A` orchestrates;
 * - **bridges the React mount lifecycle** — when `Base` is a
 *   `React.Component`, `componentDidMount` drives `init()` and
 *   `componentWillUnmount` drives `terminate()`, after delegating to any
 *   lifecycle the base already defines.
 *
 * Presentation state is **not** redeclared by the mixin: it stays where
 * the peer base owns it (React's `this.state`), so there is no shadowing.
 * For a component that holds no presentation state use
 * {@link StatelessReactView}; to expose its state to external observers
 * use {@link ObservableReactView}.
 *
 * @typeParam TBase  The peer-developer base constructor to extend.
 * @param Base       The class to graft the View Generalization onto.
 * @returns          A subclass of `Base` carrying the View Generalization.
 *
 * @example
 * ```tsx
 * import { Component } from 'react'
 * import { ReactView } from '@xfcfam/xf-react-view'
 *
 * interface Props { userId: number }
 * interface State { name: string }
 *
 * // Inherits the actual View Generalization *and* React.Component.
 * export class UserView extends ReactView(Component<Props, State>) {
 *   override async init() {
 *     const user = await B.users.fetch(this.props.userId)
 *     this.setState({ name: user.name })
 *   }
 *   override async terminate() {}
 *   override render() { return <span>{this.state?.name}</span> }
 * }
 * ```
 */
export function ReactView<TBase extends Constructor>(Base: TBase) {
  return class ReactViewGeneralization extends Base implements ViewLifecycle {
    /**
     * Acquire UI resources / mount the view. Invoked once by the
     * Interaction injection `A` on bootstrap, and by the React mount
     * bridge ({@link componentDidMount}). Default is a no-op — override
     * to load data, subscribe, or mount.
     */
    async init(): Promise<void> {}

    /**
     * Release UI resources / unmount the view. Invoked once by `A` on
     * shutdown, and by the React unmount bridge
     * ({@link componentWillUnmount}). Default is a no-op — override to
     * unsubscribe or tear down.
     */
    async terminate(): Promise<void> {}

    /**
     * React lifecycle bridge. Delegates to the base's own
     * `componentDidMount` (if any), then runs the XF {@link init} hook.
     * Inert when `Base` is not a React component.
     */
    componentDidMount(): void {
      ;(Base.prototype as ReactLifecycle).componentDidMount?.call(this)
      void this.init()
    }

    /**
     * React lifecycle bridge. Runs the XF {@link terminate} hook, then
     * delegates to the base's own `componentWillUnmount` (if any). Inert
     * when `Base` is not a React component.
     */
    componentWillUnmount(): void {
      void this.terminate()
      ;(Base.prototype as ReactLifecycle).componentWillUnmount?.call(this)
    }
  }
}

/**
 * Constructor signature accepted by the mixin factories. Mirrors the
 * canonical TypeScript mixin `Constructor<T>` helper: any class whose
 * instances are assignable to `T`.
 *
 * @typeParam T  The instance shape the constructor produces.
 */
export type Constructor<T = object> = new (...args: any[]) => T

/**
 * The XF View lifecycle contract every mixin Generalization in this
 * package satisfies — structurally identical to the `init` / `terminate`
 * hooks of `View<T>` in `@xfcfam/xf`, so a mixed component is an XF
 * Interaction Logical the injection `A` can orchestrate.
 */
export interface ViewLifecycle {
  /** Acquire UI resources / mount the view. */
  init(): Promise<void>
  /** Release UI resources / unmount the view. */
  terminate(): Promise<void>
}

/**
 * Structural subset of the `React.Component` lifecycle the mixin bridges
 * onto. Kept local so the package carries no hard dependency on the
 * `react` types — when `Base` is a real `React.Component` these members
 * line up; when it is a plain class they are simply absent.
 */
interface ReactLifecycle {
  componentDidMount?(): void
  componentWillUnmount?(): void
}
