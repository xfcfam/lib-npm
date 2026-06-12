/**
 * Business-layer Transfer — a live WebSocket connection handed to a
 * WebSocket handler.
 *
 * A transport-neutral surface over the underlying socket: send frames,
 * listen for inbound frames and lifecycle events, close. The HTTP
 * server adapts the Fastify / `ws` socket to this shape so handlers
 * never touch the engine directly.
 *
 * Unlike `HttpRequest` / `HttpResponse` (a single request → response),
 * a WebSocket is a long-lived bidirectional channel — hence the
 * event-listener shape rather than a return value.
 */
export interface WebSocketConnection {
  /** Resolved path the client connected to. */
  readonly path: string
  /** Route parameters extracted from the path. */
  readonly params: Readonly<Record<string, string>>
  /** Query-string parameters of the upgrade request. */
  readonly query: Readonly<Record<string, string | readonly string[]>>
  /** Lowercased headers of the upgrade request. */
  readonly headers: Readonly<Record<string, string | readonly string[]>>

  /** Send a text or binary frame to the client. */
  send(data: string | Uint8Array): void
  /** Close the connection, optionally with a code and reason. */
  close(code?: number, reason?: string): void

  /** Register a listener for inbound frames. */
  onMessage(listener: (data: string | Uint8Array) => void): void
  /** Register a listener for connection close. */
  onClose(listener: (code: number, reason: string) => void): void
  /** Register a listener for socket errors. */
  onError(listener: (error: Error) => void): void
}

/**
 * Function signature of a WebSocket endpoint handler. Receives the
 * connection once the upgrade completes; wires its own message / close
 * listeners. May be async.
 */
export type WebSocketHandler = (connection: WebSocketConnection) => void | Promise<void>
