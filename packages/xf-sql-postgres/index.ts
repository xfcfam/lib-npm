/**
 * `@xfcfam/xf-sql-postgres` — PostgreSQL dialect adapter for
 * `@xfcfam/xf-sql`.
 *
 * Encapsulates `kysely`'s `PostgresDialect` over the `pg` driver
 * behind a single XF-canonical class (`PostgresDatabaseRepository`)
 * and ships the SQLSTATE → `@xfcfam/xf-sql` Exception translation
 * (`PostgresErrorUtils`).
 *
 * Peer dependencies: `@xfcfam/xf`, `@xfcfam/xf-sql`, `kysely`.
 * Runtime dependency: `pg`.
 */

// ── Access — base ─────────────────────────────────────────
export { PostgresDatabaseRepository } from './src/repository/general/PostgresDatabaseRepository.js'
export type { PostgresOptions } from './src/repository/general/PostgresDatabaseRepository.js'

// ── Access — utils ────────────────────────────────────────
export { PostgresErrorUtils } from './src/repository/utils/PostgresErrorUtils.js'
