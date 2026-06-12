/**
 * Business-layer Transfer — a live TCP connection handed to the
 * connection handler. A transport-neutral surface over the Node socket:
 * read inbound bytes, write outbound bytes, close.
 *
 * TCP is **connection-oriented and bidirectional** — a stream of bytes,
 * not a request → response exchange — so the handler works the socket
 * directly via listeners rather than returning a value.
 */
export interface TcpConnection {
  /** Remote peer address, e.g. `203.0.113.7:54321`. */
  readonly remoteAddress: string
  /** Write bytes (or text) to the peer. */
  send(data: string | Uint8Array): void
  /** Close the connection. */
  close(): void
  /** Register a listener for inbound chunks. */
  onData(listener: (chunk: Uint8Array) => void): void
  /** Register a listener for connection close. */
  onClose(listener: () => void): void
  /** Register a listener for socket errors. */
  onError(listener: (error: Error) => void): void
}

/** Function signature of a TCP connection handler. */
export type TcpHandler = (connection: TcpConnection) => void | Promise<void>
