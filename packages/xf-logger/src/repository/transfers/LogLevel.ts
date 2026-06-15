/**
 * The six severity levels, ordered from least to most severe. A Transfer
 * type (it *is* the datum) shared by every logging component.
 *
 * `trace < debug < info < warn < error < fatal` — the log4j / pino
 * scale. Ordering and thresholds live in `LogLevelUtils`.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/** The levels in ascending severity order. */
export const LOG_LEVELS: readonly LogLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]
