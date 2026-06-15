import type { LogRecord } from '../transfers/LogRecord.js'

/**
 * Pure, stateless rendering of a {@link LogRecord} into an output line.
 * An Access primitive Utility — the default body of the overridable
 * `format(record)` operation on `LoggerRepository` and `LoggerBusiness`.
 * Override `format(...)` and delegate here, or replace entirely, to
 * homogenise output across sinks.
 */
export class LogFormatUtils {
  private constructor() {}

  /**
   * Single-line human-readable text:
   * `2026-06-13T10:00:00.000Z INFO  [app] message {"k":"v"}`.
   */
  static text(record: LogRecord): string {
    const ts = record.timestamp.toISOString()
    const level = record.level.toUpperCase().padEnd(5)
    const name = record.name !== undefined ? ` [${record.name}]` : ''
    const fields =
      record.fields !== undefined && Object.keys(record.fields).length > 0
        ? ` ${JSON.stringify(record.fields)}`
        : ''
    return `${ts} ${level}${name} ${record.message}${fields}`
  }

  /** Structured single-line JSON (one object per line — NDJSON-friendly). */
  static json(record: LogRecord): string {
    return JSON.stringify({
      timestamp: record.timestamp.toISOString(),
      level: record.level,
      ...(record.name !== undefined ? { name: record.name } : {}),
      message: record.message,
      ...(record.fields !== undefined ? { fields: record.fields } : {}),
    })
  }
}
