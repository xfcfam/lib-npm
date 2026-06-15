import { StatelessService } from '@xfcfam/xf'
import type { GraphQLConfig } from '../../business/transfers/GraphQLConfig.js'

/**
 * Interaction-Layer Generalization for a GraphQL entry point.
 *
 * GraphQL rides on HTTP (a single `POST /graphql`), but its dispatch
 * model — one endpoint, many operations resolved by a schema — differs
 * from REST routing, so it has its own base. A `GraphQLService`
 * supplies the schema and resolvers and registers them on the server;
 * the server mounts the GraphQL engine (Mercurius) on the same Fastify
 * instance and port as the REST routes.
 *
 * Concrete subclasses override {@link config} and register from
 * `init()` with `B.server.graphql(this.config())`.
 *
 * @example
 * ```ts
 * import { GraphQLService, type GraphQLConfig } from '@xfcfam/xf-server-http'
 * import { B } from '../../business/B.js'
 *
 * export class ApiGraphQLService extends GraphQLService {
 *   override async init(): Promise<void> {
 *     B.server.graphql(this.config())
 *   }
 *
 *   protected override config(): GraphQLConfig {
 *     return {
 *       schema: `type Query { hello(name: String): String }`,
 *       resolvers: {
 *         Query: { hello: (_: unknown, a: { name?: string }) => `Hi ${a.name ?? 'world'}` },
 *       },
 *       graphiql: true,
 *     }
 *   }
 * }
 * ```
 */
export abstract class GraphQLService extends StatelessService {
  /** Interaction init — subclasses override to register the GraphQL endpoint via `B.server.graphql(...)`. */
  override async init(): Promise<void> {
    // Subclasses override and call B.server.graphql(this.config()) inside.
  }

  /** Terminate the service. No-op by default. */
  override async terminate(): Promise<void> {}

  /**
   * The GraphQL endpoint configuration (schema + resolvers + options).
   * Override to supply the API; subclasses pass the result to
   * `B.server.graphql(...)` in `init()`.
   */
  protected abstract config(): GraphQLConfig
}
