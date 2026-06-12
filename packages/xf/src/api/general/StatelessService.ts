import { Service } from './Service.js'

/**
 * Generalization for stateless Interaction Layer service components (the
 * systemic counterpart of {@link StatelessView}).
 *
 * Use this for services, handlers, or commands that translate an
 * external request into Business calls and return a response, without
 * holding state of their own.
 *
 * Equivalent to `Service<null>` with a zero-argument constructor.
 *
 * @example
 * ```ts
 * import { StatelessService } from '@xfcfam/xf'
 *
 * export class HealthService extends StatelessService {
 *   async init()      {}
 *   async terminate() {}
 *   check() { return { status: 'ok' } }
 * }
 * ```
 */
export abstract class StatelessService extends Service<null> {
  constructor() {
    super(null)
  }
}
