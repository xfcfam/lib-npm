import { StatelessBusiness } from '@xfcfam/xf'
import { R } from '../../repository/R.js'

/**
 * Business Logical — the domain logic. Logs through `R.logger`
 * (Business → Access, the ordinary descending case).
 */
export class GreeterBusiness extends StatelessBusiness {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  greet(name: string): string {
    if (name.length === 0) {
      R.logger.warn('empty name — greeting the world instead')
      name = 'world'
    }
    R.logger.info('greeting', { name })
    return `Hello, ${name}!`
  }
}
