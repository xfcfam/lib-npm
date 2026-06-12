import { GraphQLService, type GraphQLConfig } from '@xfcfam/xf-server-http'
import { B } from '../../../business/B.js'

/**
 * GraphQL entry point (Mercurius, mounted on the shared Fastify
 * instance at `/graphql`). The resolvers delegate to the Business
 * layer exactly like the REST handlers do.
 *
 * Try it: open `http://localhost:3000/graphql` (GraphiQL IDE) or
 * `curl -X POST http://localhost:3000/graphql -H 'content-type: application/json' \
 *   -d '{"query":"{ users { id name } }"}'`.
 */
export class ApiGraphQLService extends GraphQLService {
  override async init(): Promise<void> {
    B.server.graphql(this.config())
  }

  protected override config(): GraphQLConfig {
    return {
      schema: `
        type User { id: ID!  name: String!  email: String! }
        type Query {
          users: [User!]!
          user(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          users: () => B.user.list(),
          user: (_root: unknown, args: { id: string }) => B.user.findById(args.id),
        },
      },
      graphiql: true,
    }
  }
}
