import { FileRepository } from '@xfcfam/xf-fs'
import { R } from '../R.js'

/**
 * Access Logical — the filesystem sink the rotating file tree writes
 * through, registered as `R.logFile` (an `@xfcfam/xf-fs` repository).
 *
 * Its `init()` logs through `R.logger` — an **Access → Access** call made
 * through the injection. This is the subtle case logging has to get right:
 * same-layer access via the injection is canonical (§5.7), so even Access
 * components log without breaking directionality.
 */
export class LogFileRepository extends FileRepository {
  override async init(): Promise<void> {
    await super.init()
    await this.mkdir('logs', { recursive: true })
    R.logger.info('log file sink ready', { dir: 'logs' })
  }
}
