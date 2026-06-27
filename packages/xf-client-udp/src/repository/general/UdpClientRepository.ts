import { ClientRepository, ConnectionException } from '@xfcfam/xf-client'
import { createSocket } from 'node:dgram'
import type { UdpRequest, UdpResponse } from '../transfers/UdpMessage.js'

/**
 * Access-Layer Generalization for a **UDP** outbound client — the
 * `node:dgram` implementation of the {@link ClientRepository} contract.
 *
 * **Status: sketch.** Fire-and-forget by nature; one request maps onto
 * one datagram, with an optional single reply (`awaitReply`). Counterpart
 * of `@xfcfam/xf-server-udp`.
 */
export abstract class UdpClientRepository extends ClientRepository<UdpRequest, UdpResponse> {
  protected async send(request: UdpRequest): Promise<UdpResponse> {
    return await new Promise<UdpResponse>((resolve, reject) => {
      const socket = createSocket('udp4')
      const done = (res: UdpResponse) => { socket.close(); resolve(res) }
      socket.on('error', (err) => { socket.close(); reject(new ConnectionException(err, 'network', request)) })
      if (request.awaitReply === true) {
        socket.on('message', (msg: Buffer) => done({ payload: new Uint8Array(msg) }))
      }
      socket.send(request.payload, request.port, request.host, (err) => {
        if (err) { socket.close(); reject(new ConnectionException(err, 'network', request)); return }
        if (request.awaitReply !== true) done({ payload: new Uint8Array(0) })
      })
    })
  }
}
