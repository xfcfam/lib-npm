/**
 * `@xfcfam/xf-kv-redis` — Redis adapter for the `@xfcfam/xf-kv`
 * key-value / cache contract, over [`ioredis`](https://github.com/redis/ioredis).
 *
 * Extend {@link RedisKeyValueRepository} with a domain-named class
 * (`SessionRepository`) and register it in your Access injection `R`.
 * The Business and Interaction layers above never see Redis.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Access Generalization ─────────────────────────────────
export { RedisKeyValueRepository } from './src/repository/general/RedisKeyValueRepository.js'
export type { RedisOptions } from './src/repository/general/RedisKeyValueRepository.js'

// ── Utilities ─────────────────────────────────────────────
export { RedisErrorUtils } from './src/repository/utils/RedisErrorUtils.js'
