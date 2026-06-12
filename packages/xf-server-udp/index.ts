/**
 * `@xfcfam/xf-server-udp` — UDP transport for the XF Architecture Model
 * (CFAM). **Sketch**: a datagram (plus an optional reply) is a loose
 * request → response, so UDP fits the `@xfcfam/xf-server` pipeline
 * (`dispatch`) — it only lacks addressing (one handler per socket).
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Business Generalization ───────────────────────────────
export { UdpServerBusiness } from './src/business/general/UdpServerBusiness.js'
export type { UdpServerOptions } from './src/business/general/UdpServerBusiness.js'

// ── Transfers ─────────────────────────────────────────────
export type { Datagram, DatagramReply, DatagramHandler } from './src/business/transfers/Datagram.js'
