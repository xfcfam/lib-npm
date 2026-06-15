/**
 * `@xfcfam/xf-kv-memcached` — Memcached adapter for the `@xfcfam/xf-kv`
 * key-value / cache contract, over [`memjs`](https://github.com/memcachier/memjs).
 *
 * A deliberate **boundary case**: Memcached has no key enumeration or
 * TTL introspection, so `clear()` raises and `ttl()` returns `undefined`
 * (see {@link MemcachedKeyValueRepository}). Use `@xfcfam/xf-kv-redis`
 * when you need those.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Access Generalization ─────────────────────────────────
export { MemcachedKeyValueRepository } from './src/repository/general/MemcachedKeyValueRepository.js'
export type { MemcachedOptions } from './src/repository/general/MemcachedKeyValueRepository.js'

// ── Utilities ─────────────────────────────────────────────
export { MemcachedErrorUtils } from './src/repository/utils/MemcachedErrorUtils.js'
