import { StatelessService } from '@xfcfam/xf'
import { B } from '../../../business/B.js'
import { R } from '../../../repository/R.js'

/**
 * Interaction Logical — the entry point an external actor calls. Logs
 * through `R.logger` (Interaction → Access, descending) and delegates the
 * work to the Business layer through `B`. The `debug` line is dropped by
 * the logger's `info` policy — a live demonstration of `accepts()`.
 */
export class GreeterService extends StatelessService {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  greet(name: string): string {
    R.logger.debug('service: request received', { name }) // dropped (below info)
    const message = B.greeter.greet(name)
    R.logger.info('service: response served', { name })
    return message
  }
}
