import { ServerBusiness, type ServerState } from '@xfcfam/xf-server'
import type { Datagram, DatagramHandler, DatagramReply } from '../transfers/Datagram.js'
import { createSocket, type Socket } from 'node:dgram'

/** Configuration accepted by {@link UdpServerBusiness}'s constructor. */
export interface UdpServerOptions {
  /** UDP port to bind. */
  readonly port: number
  /** Host to bind. Default `'0.0.0.0'`. */
  readonly host?: string
  /** Socket type. Default `'udp4'`. */
  readonly type?: 'udp4' | 'udp6'
}

interface UdpServerState extends ServerState<null, Datagram, DatagramReply | null> {
  readonly options: UdpServerOptions
  socket: Socket | undefined
}

/**
 * Business-Layer Generalization for a **UDP** inbound server — the
 * `node:dgram` implementation of the {@link ServerBusiness} contract.
 *
 * **Status: sketch.** Unlike TCP, UDP fits the core pipeline reasonably
 * well: each datagram is an independent message, and a handler may
 * return an optional reply — i.e. a (loose) request → response. So a
 * datagram is routed through the core {@link dispatch}
 * (`onRequest → handler → onResponse`, `onError` in the catch), with the
 * reply sent back to the origin. What it lacks is addressing (one
 * handler for the whole socket, address slot `null`).
 *
 * The single datagram handler is registered with `message(handler)`;
 * the start-point calls `listen()` / `close()`.
 */
export abstract class UdpServerBusiness extends ServerBusiness<null, Datagram, DatagramReply | null, UdpServerState> {
  constructor(options: UdpServerOptions) {
    super({ options, routes: [], socket: undefined })
  }

  /** Register the datagram handler (one per socket; address slot `null`). */
  message(handler: DatagramHandler): void {
    this.register(null, handler)
  }

  override async listen(): Promise<void> {
    const route = this.routes[0]
    const handler: DatagramHandler = route?.handler ?? (() => null)
    const socket = createSocket(this.state.options.type ?? 'udp4')
    this.state.socket = socket

    socket.on('message', (msg: Buffer, rinfo: { port: number; address: string; family: string }) => {
      const datagram: Datagram = {
        data: new Uint8Array(msg),
        port: rinfo.port,
        address: rinfo.address,
        family: rinfo.family,
      }
      void this.dispatch(datagram, handler, UdpServerBusiness.errorToReply).then((reply) => {
        if (reply === null) return
        const data = typeof reply.data === 'string' ? Buffer.from(reply.data) : Buffer.from(reply.data)
        socket.send(data, reply.port ?? datagram.port, reply.address ?? datagram.address)
      })
    })

    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject)
      socket.bind(this.state.options.port, this.state.options.host ?? '0.0.0.0', () => resolve())
    })
    await this.onStarted()
  }

  override async close(): Promise<void> {
    const socket = this.state.socket
    if (socket !== undefined) {
      await new Promise<void>((resolve) => socket.close(() => resolve()))
      this.state.socket = undefined
    }
    await this.onStopped()
  }

  /** UDP is fire-and-forget: an unhandled error simply sends no reply. */
  private static errorToReply(_err: unknown): DatagramReply | null {
    return null
  }
}
