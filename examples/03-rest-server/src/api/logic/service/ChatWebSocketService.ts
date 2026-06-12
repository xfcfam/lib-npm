import { WebSocketService, type WebSocketConnection } from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

/**
 * WebSocket entry point. Demonstrates the bidirectional channel model:
 * a single connection handler, registered on `B.server.ws(...)`, that
 * wires its own message / close listeners on each {@link WebSocketConnection}.
 *
 * Try it: `websocat ws://localhost:3000/chat` (or any WS client) and
 * type — the server echoes each frame back.
 */
export class ChatWebSocketService extends WebSocketService {
  override async init(): Promise<void> {
    B.server.ws('/chat', this.accept(this.onConnection))
  }

  private onConnection(conn: WebSocketConnection): void {
    conn.send('▸ welcome to /chat — anything you send is echoed back')
    conn.onMessage((data) => {
      const text = typeof data === 'string' ? data : `[${data.byteLength} binary bytes]`
      conn.send(`echo: ${text}`)
    })
    conn.onClose(() => console.log('[chat] client disconnected'))
    conn.onError((err) => console.error('[chat] socket error:', err.message))
  }
}
