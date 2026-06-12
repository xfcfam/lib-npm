import { RetryRestRepository } from '@xfcfam/xf-rest'
import type { User } from '../../transfers/User.js'

/**
 * Access Layer Logical for the Users REST API.
 *
 * Extends `RetryRestRepository` (xf-rest) so we get JSON parsing,
 * error translation (`RestException` / `ConnectionException`), and a
 * sensible default retry policy (5xx + 429 + ConnectionException) for
 * free.
 *
 * This class knows the URL shape of the remote API — and nothing
 * else. No domain rules, no formatting, no business decisions.
 */
export class UsersRestRepository extends RetryRestRepository {
  constructor() {
    super('https://jsonplaceholder.typicode.com', {
      defaultHeaders: { Accept: 'application/json' },
      timeout: 10_000,
    })
  }

  fetchUser(id: number): Promise<User> {
    return this.withRetry(() => this.get<User>(`/users/${id}`))
  }

  fetchAll(): Promise<User[]> {
    return this.withRetry(() => this.get<User[]>('/users'))
  }
}
