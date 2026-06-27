/**
 * Access-layer Transfer — a live **outbound** WebSocket connection, the
 * client-side counterpart of `@xfcfam/xf-server-http`'s
 * `WebSocketConnection`.
 *
 * A WebSocket is a long-lived bidirectional channel, not a
 * request → response exchange — hence the event-listener surface rather
 * than a return value. The repository adapts the engine socket (the
 * global `WebSocket`) to this transport-neutral shape so the Business
 * Layer never touches it directly.
 */
export interface WebSocketConnection {
  /** Current ready state (`WebSocket.CONNECTING|OPEN|CLOSING|CLOSED`). */
  readonly readyState: number
  /** Send a text or binary frame to the server. */
  send(data: string | Uint8Array): void
  /** Close the connection, optionally with a code and reason. */
  close(code?: number, reason?: string): void
  /** Register a listener for inbound frames (text as `string`, binary as `Uint8Array`). */
  onMessage(listener: (data: string | Uint8Array) => void): void
  /** Register a listener for connection close. */
  onClose(listener: (code: number, reason: string) => void): void
  /** Register a listener for socket errors. */
  onError(listener: (error: Error) => void): void
}

/** Function signature of a client WebSocket handler — receives the open connection. */
export type WebSocketHandler = (connection: WebSocketConnection) => void | Promise<void>
