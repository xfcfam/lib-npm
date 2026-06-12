/**
 * Business-layer Transfer — a GraphQL endpoint registration.
 *
 * Carries everything the server needs to mount a GraphQL API on the
 * shared Fastify instance (via Mercurius): the SDL schema, the resolver
 * map, the mount path, and whether to serve the GraphiQL IDE.
 *
 * `GraphQLService` builds this and pushes it with
 * `B.server.graphql(config)` from its `init()`.
 */
export interface GraphQLConfig {
  /** GraphQL schema in SDL (Schema Definition Language) form. */
  readonly schema: string
  /**
   * Resolver map: `{ Query: {...}, Mutation: {...}, <Type>: {...} }`.
   * Shape is engine-defined; kept opaque here to avoid a hard
   * dependency on the GraphQL types at the contract level.
   */
  readonly resolvers: Readonly<Record<string, unknown>>
  /** Mount path for the endpoint. Default `'/graphql'`. */
  readonly path?: string
  /** Serve the GraphiQL IDE at the mount path. Default `false`. */
  readonly graphiql?: boolean
}
