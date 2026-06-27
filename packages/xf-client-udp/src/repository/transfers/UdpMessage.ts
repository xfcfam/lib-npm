/** Outbound UDP request: destination and datagram payload. `awaitReply` waits for one reply. */
export interface UdpRequest { readonly host: string; readonly port: number; readonly payload: Uint8Array; readonly awaitReply?: boolean }
/** Inbound UDP reply (empty when `awaitReply` is false). */
export interface UdpResponse { readonly payload: Uint8Array }
