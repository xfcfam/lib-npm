import { Business } from './Business.js'

/**
 * Generalization for stateless Business Layer components.
 *
 * Use this when the Business component only orchestrates operations
 * between Repositories and applies rules without carrying state of its
 * own — for example, pure domain calculators or routing-style services.
 *
 * Equivalent to `Business<null>` with a zero-argument constructor.
 *
 * @example
 * ```ts
 * import { StatelessBusiness } from '@xfcfam/xf'
 *
 * export class PricingBusiness extends StatelessBusiness {
 *   async init()      {}
 *   async terminate() {}
 *   total(items: Array<{ price: number }>): number {
 *     return items.reduce((s, i) => s + i.price, 0)
 *   }
 * }
 * ```
 */
export abstract class StatelessBusiness extends Business<null> {
  constructor() {
    super(null)
  }
}
