/**
 * Business-layer Transfer — a single inbound UDP datagram and its
 * origin. UDP is **message-oriented and connectionless**: each
 * datagram is independent, with no session and no delivery guarantee.
 */
export interface Datagram {
  /** Payload bytes of the datagram. */
  readonly data: Uint8Array
  /** Source port. */
  readonly port: number
  /** Source address. */
  readonly address: string
  /** Address family (`'IPv4'` | `'IPv6'`). */
  readonly family: string
}

/**
 * Business-layer Transfer — an optional reply datagram. A UDP handler
 * may return one to answer the sender, or `null` to stay silent
 * (fire-and-forget). When `port` / `address` are omitted, the reply
 * goes back to the datagram's origin.
 */
export interface DatagramReply {
  /** Payload bytes to send back. */
  readonly data: string | Uint8Array
  /** Destination port. Defaults to the source port. */
  readonly port?: number
  /** Destination address. Defaults to the source address. */
  readonly address?: string
}

/** Function signature of a UDP datagram handler. */
export type DatagramHandler = (
  datagram: Datagram,
) => Promise<DatagramReply | null> | DatagramReply | null
