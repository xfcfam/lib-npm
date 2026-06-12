import { ServerBusiness, type ServerState } from '@xfcfam/xf-server'
import type { TcpConnection, TcpHandler } from '../transfers/TcpConnection.js'
import { createServer, type Server, type Socket } from 'node:net'

/** Configuration accepted by {@link TcpServerBusiness}'s constructor. */
export interface TcpServerOptions {
  /** TCP port to bind. */
  readonly port: number
  /** Host to bind. Default `'0.0.0.0'`. */
  readonly host?: string
}

interface TcpServerState extends ServerState<null, TcpConnection, void> {
  readonly options: TcpServerOptions
  server: Server | undefined
}

/**
 * Business-Layer Generalization for a raw **TCP** inbound server — the
 * `node:net` implementation of the {@link ServerBusiness} contract.
 *
 * **Status: sketch — and a deliberate boundary case.** TCP is
 * connection-oriented (a byte stream), not request → response, and it
 * has no addressing (one listener for the whole port). So it reuses
 * only the part of the core contract that *is* universal — the
 * **lifecycle** (`init` no-op → `listen` → `close`/`terminate`, plus
 * `onStarted` / `onStopped`) — and bypasses the address-based registry
 * and the `dispatch` pipeline, which assume a request/response shape.
 * That mismatch is the point: it confirms the core is "request/response
 * server" shaped, and that raw sockets sit at its edge (see the
 * `xf-server` design notes).
 *
 * A single connection handler is registered with `connection(handler)`;
 * the start-point calls `listen()` / `close()`.
 */
export abstract class TcpServerBusiness extends ServerBusiness<null, TcpConnection, void, TcpServerState> {
  constructor(options: TcpServerOptions) {
    super({ options, routes: [], server: undefined })
  }

  /**
   * Register the connection handler. TCP has no address, so there is a
   * single handler for the whole port (the address slot is `null`).
   */
  connection(handler: TcpHandler): void {
    this.register(null, handler)
  }

  override async listen(): Promise<void> {
    const route = this.routes[0]
    const handler: TcpHandler = route?.handler ?? (() => {})
    const server = createServer((socket) => {
      void handler(TcpServerBusiness.adapt(socket))
    })
    this.state.server = server
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(this.state.options.port, this.state.options.host ?? '0.0.0.0', () => resolve())
    })
    await this.onStarted()
  }

  override async close(): Promise<void> {
    const server = this.state.server
    if (server !== undefined) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      this.state.server = undefined
    }
    await this.onStopped()
  }

  private static adapt(socket: Socket): TcpConnection {
    return {
      remoteAddress: `${socket.remoteAddress ?? ''}:${socket.remotePort ?? 0}`,
      send: (data) => { socket.write(typeof data === 'string' ? data : Buffer.from(data)) },
      close: () => socket.end(),
      onData: (listener) => socket.on('data', (chunk: Buffer) => listener(new Uint8Array(chunk))),
      onClose: (listener) => socket.on('close', () => listener()),
      onError: (listener) => socket.on('error', (err: Error) => listener(err)),
    }
  }
}
