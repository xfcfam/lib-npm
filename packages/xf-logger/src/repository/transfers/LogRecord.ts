import type { LogLevel } from './LogLevel.js'

/**
 * One immutable log event. A Transfer — it *is* the datum that flows from
 * the emit site through `LoggerRepository` to the console default and to
 * every planted tree. Carries no behaviour beyond being read.
 */
export interface LogRecord {
  /** Severity. */
  readonly level: LogLevel
  /** Human-readable message. */
  readonly message: string
  /** When the event was emitted. */
  readonly timestamp: Date
  /** Optional logger name / category (set via `LoggerOptions.name`). */
  readonly name?: string
  /** Optional structured context merged into the output. */
  readonly fields?: Readonly<Record<string, unknown>>
}
