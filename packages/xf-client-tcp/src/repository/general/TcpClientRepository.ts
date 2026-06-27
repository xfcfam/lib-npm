import { ClientRepository, ConnectionException } from '@xfcfam/xf-client'
import { connect } from 'node:net'
import type { TcpRequest, TcpResponse } from '../transfers/TcpMessage.js'

/**
 * Access-Layer Generalization for a raw **TCP** outbound client — the
 * `node:net` implementation of the {@link ClientRepository} contract.
 *
 * **Status: sketch — and a deliberate boundary case.** TCP is a byte
 * stream, not request → response. This reuses the contract's *pipeline*
 * (`onRequest → send → onResponse`) by modelling one round trip as
 * "connect → write payload → read until close", which is the natural
 * fit only for simple request/reply protocols. Long-lived or duplex
 * streams sit outside the contract — that mismatch is the point (mirror
 * of `@xfcfam/xf-server-tcp`).
 */
export abstract class TcpClientRepository extends ClientRepository<TcpRequest, TcpResponse> {
  protected async send(request: TcpRequest): Promise<TcpResponse> {
    return await new Promise<TcpResponse>((resolve, reject) => {
      const chunks: Uint8Array[] = []
      const socket = connect({ host: request.host, port: request.port }, () => {
        socket.write(request.payload)
      })
      socket.on('data', (data: Uint8Array) => { chunks.push(data) })
      socket.on('error', (err) => reject(new ConnectionException(err, 'connect', request)))
      socket.on('end', () => {
        const total = chunks.reduce((n, c) => n + c.byteLength, 0)
        const payload = new Uint8Array(total)
        let offset = 0
        for (const c of chunks) { payload.set(c, offset); offset += c.byteLength }
        resolve({ payload })
      })
    })
  }
}
