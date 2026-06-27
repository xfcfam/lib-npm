import { Repository } from '@xfcfam/xf'
import { ConnectionException } from '@xfcfam/xf-client'
import type { WebSocketConnection } from '../transfers/WebSocketConnection.js'

/**
 * Access-Layer Generalization for an **outbound WebSocket** client — the
 * client-side counterpart of `@xfcfam/xf-server-http`'s `WebSocketService`.
 *
 * A WebSocket is a duplex channel, not request → response, so this does
 * NOT extend `ClientRepository` (the `onRequest → send → onResponse`
 * pipeline). It extends the base `Repository` and opens connections to
 * the configured base URL, handing back a transport-neutral
 * {@link WebSocketConnection}. Built on the platform global `WebSocket`
 * (Node ≥ 22, browsers, React Native) — no extra dependency.
 *
 * Concrete subclasses expose domain methods that call the protected
 * {@link connect}:
 *
 * ```ts
 * export class ChatSocket extends WebSocketRepository {
 *   constructor() { super('wss://api.example.com') }
 *   async chat(): Promise<WebSocketConnection> { return this.connect('/chat') }
 * }
 * ```
 */
export abstract class WebSocketRepository extends Repository<null> {
  /** Base WebSocket URL (`ws://` / `wss://`), no trailing slash required. */
  protected readonly url: string

  constructor(url: string) {
    super(null)
    this.url = url
  }

  async init(): Promise<void> {}
  async terminate(): Promise<void> {}

  /**
   * Open an outbound WebSocket connection to `baseUrl + path`. Resolves
   * once the socket is open; rejects with a {@link ConnectionException}
   * if the handshake fails.
   */
  protected async connect(path = '', protocols?: string | string[]): Promise<WebSocketConnection> {
    const base = this.url.replace(/\/+$/, '')
    const target = path === '' ? base : `${base}/${path.replace(/^\/+/, '')}`

    const socket = new WebSocket(target, protocols)
    socket.binaryType = 'arraybuffer'

    await new Promise<void>((resolve, reject) => {
      const onOpen = (): void => { cleanup(); resolve() }
      const onErr = (): void => {
        cleanup()
        reject(new ConnectionException(new Error('WebSocket handshake failed'), 'connect', { url: target }))
      }
      const cleanup = (): void => {
        socket.removeEventListener('open', onOpen)
        socket.removeEventListener('error', onErr)
      }
      socket.addEventListener('open', onOpen)
      socket.addEventListener('error', onErr)
    })

    return WebSocketRepository.adapt(socket)
  }

  private static adapt(socket: WebSocket): WebSocketConnection {
    return {
      get readyState(): number { return socket.readyState },
      send(data: string | Uint8Array): void { socket.send(data as Parameters<WebSocket['send']>[0]) },
      close(code?: number, reason?: string): void { socket.close(code, reason) },
      onMessage(listener: (data: string | Uint8Array) => void): void {
        socket.addEventListener('message', (ev: MessageEvent) => {
          const d = ev.data
          listener(typeof d === 'string' ? d : new Uint8Array(d as ArrayBuffer))
        })
      },
      onClose(listener: (code: number, reason: string) => void): void {
        socket.addEventListener('close', (ev: CloseEvent) => listener(ev.code, ev.reason))
      },
      onError(listener: (error: Error) => void): void {
        socket.addEventListener('error', () => listener(new Error('WebSocket error')))
      },
    }
  }
}
