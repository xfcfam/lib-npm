import { StatelessService } from '@xfcfam/xf'
import type { WebSocketConnection, WebSocketHandler } from '../../business/transfers/WebSocketConnection.js'

/**
 * Interaction-Layer Generalization for a WebSocket entry point.
 *
 * A WebSocket is a long-lived bidirectional channel, not a
 * request → response exchange, so it does not extend `RestService` /
 * `EntryService` (which model the request pipeline). Instead a
 * `WebSocketService` registers connection handlers on the server and
 * manages each {@link WebSocketConnection} directly.
 *
 * Concrete subclasses register their endpoints from `init()` with
 * `B.server.ws(path, this.accept(this.onConnection))`. The server runs
 * the WebSocket plugin on the same Fastify instance and the same port
 * as the REST routes.
 *
 * @example
 * ```ts
 * import { WebSocketService, type WebSocketConnection } from '@xfcfam/xf-server-http'
 * import { B } from '../../business/B.js'
 *
 * export class ChatService extends WebSocketService {
 *   override async init(): Promise<void> {
 *     B.server.ws('/chat', this.accept(this.onConnection))
 *   }
 *
 *   private onConnection(conn: WebSocketConnection): void {
 *     conn.onMessage((data) => conn.send(`echo: ${String(data)}`))
 *   }
 * }
 * ```
 */
export abstract class WebSocketService extends StatelessService {
  override async init(): Promise<void> {
    // Subclasses override and call B.server.ws(path, handler) inside.
  }

  override async terminate(): Promise<void> {}

  /**
   * Bind a connection handler to `this` so it is safe to pass directly
   * to `B.server.ws(path, this.accept(this.onConnection))`.
   */
  protected accept(handler: WebSocketHandler): WebSocketHandler {
    return handler.bind(this)
  }
}
