import { WebSocketRepository } from './WebSocketRepository.js'
import type { WebSocketConnection } from '../transfers/WebSocketConnection.js'
import type { GraphQLSubscriptionSink, GraphQLWsClient } from '../transfers/GraphQLSubscription.js'

/**
 * Access-Layer Generalization for **GraphQL subscriptions** over the
 * `graphql-transport-ws` protocol — the streaming counterpart of
 * {@link GraphQLRepository} (which handles query/mutation over HTTP).
 *
 * Subscriptions are duplex (WebSocket), so this **extends
 * {@link WebSocketRepository}**, not `RestRepository`. {@link open}
 * connects with the `graphql-transport-ws` subprotocol, performs the
 * `connection_init → connection_ack` handshake, and returns a
 * {@link GraphQLWsClient} that multiplexes `subscribe` operations over the
 * single socket, replying to server `ping`s with `pong`.
 *
 * ```ts
 * export class ApiSubs extends GraphQLWsRepository {
 *   constructor() { super('wss://api.example.com') }
 *   async live() { return this.open('/graphql', { authToken: '…' }) }
 * }
 * // const c = await api.live(); c.subscribe(`subscription{ ticks }`, undefined, { next: console.log })
 * ```
 */
export abstract class GraphQLWsRepository extends WebSocketRepository {
  /**
   * Open a `graphql-transport-ws` session: connect, handshake, and return
   * a {@link GraphQLWsClient}. `initPayload` is sent with `connection_init`
   * (e.g. an auth token).
   */
  protected async open(path = '/graphql', initPayload?: Record<string, unknown>): Promise<GraphQLWsClient> {
    const conn = await this.connect(path, 'graphql-transport-ws')
    return await GraphQLWsRepository.handshake(conn, initPayload)
  }

  private static handshake(
    conn: WebSocketConnection,
    initPayload: Record<string, unknown> | undefined,
  ): Promise<GraphQLWsClient> {
    return new Promise<GraphQLWsClient>((resolve, reject) => {
      const sinks = new Map<string, GraphQLSubscriptionSink>()
      let counter = 0
      let acked = false

      const client: GraphQLWsClient = {
        subscribe(query, variables, sink) {
          const id = String(++counter)
          sinks.set(id, sink as GraphQLSubscriptionSink)
          conn.send(JSON.stringify({
            id, type: 'subscribe',
            payload: { query, ...(variables !== undefined ? { variables } : {}) },
          }))
          return (): void => {
            if (sinks.delete(id)) conn.send(JSON.stringify({ id, type: 'complete' }))
          }
        },
        dispose(): void { conn.close(1000, 'client dispose') },
      }

      conn.onMessage((raw) => {
        const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
        let msg: any
        try { msg = JSON.parse(text) } catch { return }
        switch (msg.type) {
          case 'connection_ack':
            if (!acked) { acked = true; resolve(client) }
            break
          case 'next': {
            const sink = sinks.get(msg.id)
            if (sink === undefined) break
            const payload = msg.payload
            if (payload?.errors !== undefined && payload.errors.length > 0) sink.error?.(payload.errors)
            else sink.next(payload?.data)
            break
          }
          case 'error': {
            const sink = sinks.get(msg.id)
            sink?.error?.(msg.payload ?? [])
            sinks.delete(msg.id)
            break
          }
          case 'complete': {
            const sink = sinks.get(msg.id)
            sink?.complete?.()
            sinks.delete(msg.id)
            break
          }
          case 'ping':
            conn.send(JSON.stringify({ type: 'pong' }))
            break
        }
      })
      conn.onError((err) => { if (!acked) reject(err) })
      conn.onClose(() => { for (const s of sinks.values()) s.complete?.(); sinks.clear() })

      conn.send(JSON.stringify({ type: 'connection_init', ...(initPayload !== undefined ? { payload: initPayload } : {}) }))
    })
  }
}
