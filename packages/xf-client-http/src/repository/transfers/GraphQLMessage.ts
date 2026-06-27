/** A GraphQL operation request body (`POST` to the endpoint). */
export interface GraphQLRequest<TVars = Record<string, unknown>> {
  /** The query or mutation document. */
  readonly query: string
  /** Operation variables. */
  readonly variables?: TVars
  /** Operation name, when the document declares several. */
  readonly operationName?: string
}

/** A single GraphQL error as returned in the `errors` array. */
export interface GraphQLError {
  readonly message: string
  readonly path?: ReadonlyArray<string | number>
  readonly extensions?: Readonly<Record<string, unknown>>
}

/** The GraphQL-over-HTTP response envelope (`{ data, errors }`). */
export interface GraphQLResponse<TData = unknown> {
  readonly data?: TData | null
  readonly errors?: ReadonlyArray<GraphQLError>
}
