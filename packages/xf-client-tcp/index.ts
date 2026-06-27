/**
 * `@xfcfam/xf-client-tcp` — raw TCP outbound client for the XF
 * Architecture Model (CFAM). **Sketch** / boundary case: the
 * `@xfcfam/xf-client` contract over `node:net`. Counterpart of
 * `@xfcfam/xf-server-tcp`.
 */
export { TcpClientRepository } from './src/repository/general/TcpClientRepository.js'
export type { TcpRequest, TcpResponse } from './src/repository/transfers/TcpMessage.js'
