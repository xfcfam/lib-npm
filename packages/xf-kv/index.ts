/**
 * `@xfcfam/xf-kv` — transport-agnostic **key-value / cache store
 * contract** for the XF Architecture Model (CFAM).
 *
 * This package holds no backend of its own. It defines the abstract
 * Access-Layer Generalization every `@xfcfam/xf-kv-*` adapter
 * implements, so they all share one lifecycle, one operation surface,
 * namespacing, value serialisation and typed error translation —
 * regardless of store (Redis, Memcached, …).
 *
 * Exposes:
 *
 * - **{@link KeyValueRepository}** — the Access Generalization. Concrete
 *   adapters implement its protected `*Raw` primitives; consumers extend
 *   an adapter and name it by domain (`SessionRepository`).
 * - **Transfers**: {@link Entry}, {@link Codec}.
 * - **Utilities**: {@link CodecUtils} (JSON default), {@link KeyUtils}.
 * - **Exceptions**: {@link KeyValueException} (base) +
 *   {@link ConnectionException}, {@link SerializationException}.
 *
 * You typically install a concrete adapter, not this package directly.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Access Generalization ─────────────────────────────────
export { KeyValueRepository } from './src/repository/general/KeyValueRepository.js'
export type { KeyValueOptions } from './src/repository/general/KeyValueRepository.js'

// ── Transfers ─────────────────────────────────────────────
export type { Entry } from './src/repository/transfers/Entry.js'
export type { Codec } from './src/repository/transfers/Codec.js'

// ── Utilities ─────────────────────────────────────────────
export { CodecUtils } from './src/repository/utils/CodecUtils.js'
export { KeyUtils } from './src/repository/utils/KeyUtils.js'

// ── Exceptions ────────────────────────────────────────────
export { KeyValueException } from './src/repository/transfers/KeyValueException.js'
export { ConnectionException } from './src/repository/transfers/ConnectionException.js'
export { SerializationException } from './src/repository/transfers/SerializationException.js'
