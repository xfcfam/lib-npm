import { StatelessBusiness } from '@xfcfam/xf'
import { R } from '../../repository/R'
import type { User } from '../../repository/transfers/User'

/**
 * Business Layer Logical for the User domain.
 *
 * Owns the domain rules around users. Has no state of its own (this
 * example is intentionally simple), so it extends `StatelessBusiness`.
 *
 * Talks to the Access Layer exclusively through `R.usersRest` — never
 * imports `UsersRestRepository` directly. This keeps the Business Layer
 * agnostic to which concrete Repository implements the contract.
 */
export class UserBusiness extends StatelessBusiness {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  async getUser(id: number): Promise<User> {
    return R.usersRest.fetchUser(id)
  }

  async listActiveUsers(): Promise<User[]> {
    const all = await R.usersRest.fetchAll()
    // Trivial domain rule: a user "looks active" if their email contains a dot.
    // The point is that this lives in Business, not Access.
    return all.filter(u => u.email.includes('.'))
  }
}
