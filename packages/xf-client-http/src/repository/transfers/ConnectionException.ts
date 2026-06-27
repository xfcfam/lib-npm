/**
 * Re-exported from `@xfcfam/xf-client`. A transport-level failure (no
 * response received): DNS / TLS / socket / timeout. Distinct from a
 * `RestException`, which means the server answered with a non-2xx status.
 */
export { ConnectionException } from '@xfcfam/xf-client'
