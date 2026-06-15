import { RotatingFileTreeBusiness } from '@xfcfam/xf-logger-file'
import type { FileRepository } from '@xfcfam/xf-fs'
import type { LoggerRepository } from '@xfcfam/xf-logger'
import { R } from '../../repository/R.js'

/**
 * Business Logical — the rotating file tree, wired to the artefact's
 * injections. `logger()` and `file()` reach `R` (Business → Access,
 * descending). A deliberately tiny `maxBytes` so the demo actually rotates.
 */
export class AppFileTreeBusiness extends RotatingFileTreeBusiness {
  constructor() {
    super({ path: 'logs/app.log', maxBytes: 256, maxFiles: 3 })
  }

  protected logger(): LoggerRepository {
    return R.logger
  }

  protected file(): FileRepository {
    return R.logFile
  }
}
