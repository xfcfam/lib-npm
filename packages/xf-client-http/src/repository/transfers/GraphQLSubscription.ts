import type { GraphQLError } from './GraphQLMessage.js'

/** Observer for a GraphQL subscription stream. */
export interface GraphQLSubscriptionSink<TData = unknown> {
  /** Called with each emitted result's `data`. */
  next: (data: TData) => void
  /** Called when the operation errors (the GraphQL `errors` array). */
  error?: (errors: ReadonlyArray<GraphQLError>) => void
  /** Called once when the server completes the subscription. */
  complete?: () => void
}

/**
 * A live `graphql-transport-ws` session over a single WebSocket: open
 * multiple subscriptions, dispose the connection.
 */
export interface GraphQLWsClient {
  /**
   * Start a subscription. Routes `next` / `error` / `complete` to the
   * {@link GraphQLSubscriptionSink}. Returns an unsubscribe function that
   * sends `complete` to the server and stops local delivery.
   */
  subscribe<TData = unknown, TVars = Record<string, unknown>>(
    query: string,
    variables: TVars | undefined,
    sink: GraphQLSubscriptionSink<TData>,
  ): () => void
  /** Close the underlying WebSocket and complete all active subscriptions. */
  dispose(): void
}
