/** Outbound TCP request: where to connect and the bytes to write. */
export interface TcpRequest { readonly host: string; readonly port: number; readonly payload: Uint8Array }
/** Inbound TCP reply: the bytes read back before the peer closed (empty if none). */
export interface TcpResponse { readonly payload: Uint8Array }
