import { View } from './View.js'

/**
 * Generalization for stateless Interaction Layer components.
 *
 * Use this for services, handlers, or commands that translate an
 * external request into Business calls and return a response, without
 * holding state of their own.
 *
 * Equivalent to `View<null>` with a zero-argument constructor.
 *
 * @example
 * ```ts
 * import { StatelessView } from '@xfcfam/xf'
 *
 * export class HealthService extends StatelessView {
 *   async init()      {}
 *   async terminate() {}
 *   check() { return { status: 'ok' } }
 * }
 * ```
 */
export abstract class StatelessView extends View<null> {
  constructor() {
    super(null)
  }
}
