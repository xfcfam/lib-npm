import { ReactView, type Constructor } from './ReactView.js'

/**
 * Mixin Generalization for stateless GUI / presentation Interaction
 * Layer components — the mixin counterpart of `StatelessView` from
 * `@xfcfam/xf`, for components that must also extend a peer-developer
 * class.
 *
 * Just as `StatelessView` is `View<null>` in the core library,
 * `StatelessReactView(Base)` is {@link ReactView} applied to a base that
 * carries no presentation state of its own (a `React.Component<Props>`
 * with no state type, a `React.PureComponent`, …). It contributes the
 * XF View lifecycle ({@link ViewLifecycle}) and the React mount bridge,
 * and nothing else.
 *
 * Use this for views that render purely from props. For a stateful view
 * use {@link ReactView}; to expose state to observers use
 * {@link ObservableReactView}.
 *
 * @typeParam TBase  The peer-developer base constructor to extend.
 * @param Base       The class to graft the stateless View Generalization onto.
 * @returns          A subclass of `Base` carrying the View Generalization.
 *
 * @example
 * ```tsx
 * import { Component } from 'react'
 * import { StatelessReactView } from '@xfcfam/xf-react-view'
 *
 * export class SplashView extends StatelessReactView(Component<{ logo: string }>) {
 *   override async init() {}
 *   override async terminate() {}
 *   override render() { return <img src={this.props.logo} /> }
 * }
 * ```
 */
export function StatelessReactView<TBase extends Constructor>(Base: TBase) {
  return class StatelessReactViewGeneralization extends ReactView(Base) {}
}
