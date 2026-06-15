import type { LogLevel } from '../transfers/LogLevel.js'

/** Numeric severity of each level (gaps left for future intermediates). */
const SEVERITY: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
}

/**
 * Pure, stateless helpers for ordering and thresholding {@link LogLevel}s.
 * An Access primitive Utility (no domain semantics, referenceable from any
 * layer): the natural home for the level algebra both `LoggerRepository`
 * and `LoggerBusiness` reuse when implementing `accepts(...)` policies.
 */
export class LogLevelUtils {
  private constructor() {}

  /** Numeric severity (higher = more severe). */
  static severity(level: LogLevel): number {
    return SEVERITY[level]
  }

  /** Whether `level` is at least as severe as `threshold`. */
  static gte(level: LogLevel, threshold: LogLevel): boolean {
    return SEVERITY[level] >= SEVERITY[threshold]
  }

  /** Comparator: negative if `a` is less severe than `b`, etc. */
  static compare(a: LogLevel, b: LogLevel): number {
    return SEVERITY[a] - SEVERITY[b]
  }
}
