import { RestRepository } from './RestRepository.js'
import { GraphQLException } from '../transfers/GraphQLException.js'
import type { GraphQLRequest, GraphQLResponse } from '../transfers/GraphQLMessage.js'

/**
 * Access-Layer Generalization for a **GraphQL-over-HTTP** client — the
 * client-side counterpart of `@xfcfam/xf-server-http`'s `GraphQLService`.
 *
 * GraphQL rides on HTTP (a single `POST /graphql`, one endpoint and many
 * operations), so this **extends {@link RestRepository}** and reuses its
 * pipeline / encoding / `HttpResponse`. It adds {@link query} /
 * {@link mutate}, which post the operation and unwrap `data`, raising a
 * {@link GraphQLException} when the response carries `errors`. (HTTP-level
 * failures still raise `RestException`; subscriptions ride on
 * {@link WebSocketRepository}.)
 *
 * ```ts
 * export class ApiGraphQL extends GraphQLRepository {
 *   constructor() { super('https://api.example.com') }
 *   getUser(id: string) {
 *     return this.query<{ user: User }>(`query($id:ID!){ user(id:$id){ name } }`, { id })
 *   }
 * }
 * ```
 */
export abstract class GraphQLRepository extends RestRepository {
  /** Mount path of the GraphQL endpoint. Override if not `'/graphql'`. */
  protected readonly path: string = '/graphql'

  /**
   * Run a query or mutation. Returns `data`; throws {@link GraphQLException}
   * if the response carries a non-empty `errors` array.
   */
  async query<TData = unknown, TVars = Record<string, unknown>>(
    query: string,
    variables?: TVars,
    headers?: Record<string, string>,
  ): Promise<TData> {
    const request: GraphQLRequest<TVars> = { query, ...(variables !== undefined ? { variables } : {}) }
    const res = await this.post<GraphQLResponse<TData>>(this.path, request, headers)
    const payload = res.body
    if (payload.errors !== undefined && payload.errors.length > 0) {
      throw new GraphQLException(payload.errors)
    }
    return payload.data as TData
  }

  /** Alias of {@link query} for mutations (same HTTP transport). */
  async mutate<TData = unknown, TVars = Record<string, unknown>>(
    mutation: string,
    variables?: TVars,
    headers?: Record<string, string>,
  ): Promise<TData> {
    return this.query<TData, TVars>(mutation, variables, headers)
  }
}
