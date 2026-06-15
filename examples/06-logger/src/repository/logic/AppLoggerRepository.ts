import { LoggerRepository, LogLevelUtils, LogFormatUtils, type LogRecord } from '@xfcfam/xf-logger'

/**
 * Access Logical — the artefact's logger, registered as `R.logger`.
 *
 * Shows the two overridable *configuration operations*:
 *  - `accepts(record)` — policy: drop everything below `info`.
 *  - `format(record)`  — homogenise: one JSON object per line, everywhere.
 */
export class AppLoggerRepository extends LoggerRepository {
  constructor() {
    super({ name: 'demo' })
  }

  protected override accepts(record: LogRecord): boolean {
    return LogLevelUtils.gte(record.level, 'info')
  }

  protected override format(record: LogRecord): string {
    return LogFormatUtils.json(record)
  }
}
