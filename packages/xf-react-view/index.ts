/**
 * `@xfcfam/xf-react-view` — React presentation Generalizations for the
 * Interaction Layer of the XF Architecture Model (CFAM).
 *
 * React class components must `extends React.Component`, but XF requires
 * every component to inherit its layer Generalization (the `View` suffix
 * of the Interaction Layer). TypeScript's single inheritance makes that a
 * conflict. The XF directive for the conflict is the **Mixin
 * Generalization**: a class factory that grafts the Generalization onto
 * the peer-developer base, so a component inherits the *actual*
 * Generalization surface without surrendering its `React.Component` base.
 *
 * Exposes the three GUI Generalizations of `@xfcfam/xf` in mixin form:
 *
 * - **{@link ReactView}** — stateful presentation View (mirrors `View<T>`),
 *   with a React mount/unmount → `init`/`terminate` lifecycle bridge.
 * - **{@link ObservableReactView}** — observable View whose snapshots can
 *   be fanned out to external observers (mirrors `ObservableView<T>`).
 * - **{@link StatelessReactView}** — stateless presentation View
 *   (mirrors `StatelessView`).
 *
 * Plus the mixin building blocks: the {@link Constructor} helper type and
 * the {@link ViewLifecycle} contract every mixed component satisfies.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Interaction Generalizations (mixins) ──────────────────
export { ReactView } from './src/api/general/ReactView.js'
export type { Constructor, ViewLifecycle } from './src/api/general/ReactView.js'
export { ObservableReactView } from './src/api/general/ObservableReactView.js'
export type { ObservableSurface } from './src/api/general/ObservableReactView.js'
export { StatelessReactView } from './src/api/general/StatelessReactView.js'
