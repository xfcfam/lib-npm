/**
 * `@xfcfam/xf-client-udp` — UDP outbound client for the XF Architecture
 * Model (CFAM). **Sketch**: the `@xfcfam/xf-client` contract over
 * `node:dgram`. Counterpart of `@xfcfam/xf-server-udp`.
 */
export { UdpClientRepository } from './src/repository/general/UdpClientRepository.js'
export type { UdpRequest, UdpResponse } from './src/repository/transfers/UdpMessage.js'
