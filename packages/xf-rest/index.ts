/**
 * `@xfcfam/xf-rest` — REST Access Layer Generalization for the XF
 * Architecture Model.
 *
 * Encapsulates the `ky` HTTP client behind a single XF-canonical
 * Generalization (`RestRepository`), three Transfer objects
 * (`Request`, `RestException`, `ConnectionException`), and two static
 * utility classes (`ParseUtils`, `ReviverUtils`).
 *
 * Out of the box xf-rest handles `application/json` (including
 * `*+json` variants) and `text/*` responses. XML, CSV, MessagePack
 * and other formats are supported by registering a `Parser` in
 * `RestOptions.parsers`.
 *
 * `@xfcfam/xf` is declared as a peer dependency: the consumer's
 * project must add **both** `@xfcfam/xf` and `@xfcfam/xf-rest` to its
 * `package.json`.
 *
 * See https://xfcfam.org for the XF specification.
 */

// ── Access — base ─────────────────────────────────────────
export { RestRepository } from './src/repository/general/RestRepository.js'
export type { RestOptions } from './src/repository/general/RestRepository.js'
export { RetryRestRepository } from './src/repository/general/RetryRestRepository.js'

// ── Access — structs ──────────────────────────────────────
export type { Request, HttpMethod } from './src/repository/transfers/Request.js'
export { RestException } from './src/repository/transfers/RestException.js'
export { ConnectionException } from './src/repository/transfers/ConnectionException.js'

// ── Access — utils ────────────────────────────────────────
export { ParseUtils } from './src/repository/utils/ParseUtils.js'
export type { Parser } from './src/repository/utils/ParseUtils.js'
export { ReviverUtils } from './src/repository/utils/ReviverUtils.js'
export type { Reviver } from './src/repository/utils/ReviverUtils.js'
