import { View } from './View.js'

/**
 * Generalization for stateless GUI / presentation Interaction Layer
 * components — the stateless counterpart of {@link View}.
 *
 * Use this for views that hold no state of their own. For stateless
 * *systemic* components (services, handlers, commands) use
 * {@link StatelessService} instead.
 *
 * Equivalent to `View<null>` with a zero-argument constructor.
 *
 * @example
 * ```ts
 * import { StatelessView } from '@xfcfam/xf'
 *
 * export class SplashView extends StatelessView {
 *   async init()      {}
 *   async terminate() {}
 * }
 * ```
 */
export abstract class StatelessView extends View<null> {
  constructor() {
    super(null)
  }
}
