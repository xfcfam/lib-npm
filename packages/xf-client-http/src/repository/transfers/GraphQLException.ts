import { ClientException } from '@xfcfam/xf-client'
import type { GraphQLError } from './GraphQLMessage.js'

/**
 * Thrown by `GraphQLRepository` when a 2xx GraphQL response carries an
 * `errors` array (GraphQL signals operation failures in-band, not via
 * HTTP status). The GraphQL specialisation of `@xfcfam/xf-client`'s
 * `ClientException`: its `body` is the full `errors` array.
 */
export class GraphQLException extends ClientException {
  /** The GraphQL errors returned by the server. */
  readonly errors: ReadonlyArray<GraphQLError>

  constructor(errors: ReadonlyArray<GraphQLError>) {
    super(errors[0]?.message ?? 'GraphQL error', errors)
    this.name = 'GraphQLException'
    this.errors = errors
  }
}
