/**
 * `@xfcfam/xf-server-tcp` — raw TCP transport for the XF Architecture
 * Model (CFAM). **Sketch** and boundary case: TCP is connection-oriented
 * with no addressing, so it reuses only the *lifecycle* of the
 * `@xfcfam/xf-server` contract and bypasses the request pipeline — which
 * is exactly what confirms the core is request/response shaped.
 *
 * See https://xfcfam.org for the full XF specification.
 */

// ── Business Generalization ───────────────────────────────
export { TcpServerBusiness } from './src/business/general/TcpServerBusiness.js'
export type { TcpServerOptions } from './src/business/general/TcpServerBusiness.js'

// ── Transfers ─────────────────────────────────────────────
export type { TcpConnection, TcpHandler } from './src/business/transfers/TcpConnection.js'
