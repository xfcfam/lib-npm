import { AppLoggerRepository } from './logic/AppLoggerRepository.js'
import { LogFileRepository } from './logic/LogFileRepository.js'

/**
 * Access Layer Injection. Owns the logger and the file sink, and is the
 * conduit every layer (including Access itself) uses to reach them:
 * `R.logger.info(...)`, `R.logFile.append(...)`.
 *
 * `logger` initialises first so `logFile.init()` can already log through it.
 */
export class R {
  private constructor() {}

  static readonly logger = new AppLoggerRepository()
  static readonly logFile = new LogFileRepository()

  static async init(): Promise<void> {
    await R.logger.init()
    await R.logFile.init()
  }

  static async terminate(): Promise<void> {
    await R.logFile.terminate()
    await R.logger.terminate() // flushes pending tree writes
  }
}
