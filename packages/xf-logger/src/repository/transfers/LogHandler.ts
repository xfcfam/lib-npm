import type { LogRecord } from './LogRecord.js'

/**
 * The callback a tree plants into `LoggerRepository.tree(...)`. A Transfer
 * (a function-typed datum, like an HTTP `Handler`): `LoggerRepository`
 * (Access) holds and invokes these without ever knowing the
 * `LoggerBusiness` (Business) that produced them — so the policy lives in
 * Business while the registry stays in Access, with no upward dependency.
 */
export type LogHandler = (record: LogRecord) => void | Promise<void>
