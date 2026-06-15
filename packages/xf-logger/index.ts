/**
 * `@xfcfam/xf-logger` — logging access point for the XF Architecture
 * Model (CFAM), self-contained and dependency-free.
 *
 * Logging is the canonical cross-cutting capability (§5.3): it lives in an
 * Access Logical reached through `R`, so every layer — Business,
 * Interaction, and Access itself — calls `R.logger.*` with no upward
 * dependency. The *policy* (multiplexing, rotation, routing) lives in
 * Business "trees" ({@link LoggerBusiness}) that plant themselves into the
 * logger; the *I/O* stays in Access.
 *
 * Exposes:
 *
 * - **{@link LoggerRepository}** — the Access Generalization, `R.logger`:
 *   emit API, overridable `format` / `accepts`, console default, and the
 *   `tree(...)` registry.
 * - **{@link LoggerBusiness}** — base tree (overridable `format` /
 *   `accepts` / `shouldRotate` / `shouldFlush`).
 * - **{@link ConsoleTreeBusiness}** — built-in console tree (no deps).
 * - **Transfers**: {@link LogRecord}, {@link LogLevel}, {@link LogHandler}.
 * - **Utilities**: {@link LogFormatUtils} (text / JSON), {@link LogLevelUtils}.
 * - **Exceptions**: {@link LoggingException}.
 *
 * For rotating file output, add `@xfcfam/xf-logger-file`.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Access Generalization ─────────────────────────────────
export { LoggerRepository } from './src/repository/general/LoggerRepository.js'
export type { LoggerOptions } from './src/repository/general/LoggerRepository.js'

// ── Transfers ─────────────────────────────────────────────
export type { LogLevel } from './src/repository/transfers/LogLevel.js'
export { LOG_LEVELS } from './src/repository/transfers/LogLevel.js'
export type { LogRecord } from './src/repository/transfers/LogRecord.js'
export type { LogHandler } from './src/repository/transfers/LogHandler.js'

// ── Utilities ─────────────────────────────────────────────
export { LogFormatUtils } from './src/repository/utils/LogFormatUtils.js'
export { LogLevelUtils } from './src/repository/utils/LogLevelUtils.js'

// ── Exceptions ────────────────────────────────────────────
export { LoggingException } from './src/repository/transfers/LoggingException.js'

// ── Business Generalizations (trees) ──────────────────────
export { LoggerBusiness } from './src/business/general/LoggerBusiness.js'
export { ConsoleTreeBusiness } from './src/business/general/ConsoleTreeBusiness.js'
