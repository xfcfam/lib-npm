import { StatelessBusiness } from '@xfcfam/xf'
import { UniqueViolationException } from '@xfcfam/xf-sql'
import { R } from '../../repository/R'
import type { User } from '../../repository/transfers/User'

/**
 * Business Layer Logical for the User domain.
 *
 * No state of its own → `StatelessBusiness`. Talks to the Access
 * Layer exclusively through `R.usersDb`. Applies one trivial domain
 * rule (`isActiveLooking`) to show where rules live — never inside
 * the Repository.
 */
export class UserBusiness extends StatelessBusiness {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  /** Domain helper: an email looks "real" if it has a dot in the domain part. */
  static isActiveLooking(u: User): boolean {
    const at = u.email.indexOf('@')
    return at >= 0 && u.email.slice(at + 1).includes('.')
  }

  async getUser(id: number): Promise<User> {
    return R.usersDb.fetchById(id)
  }

  async listActiveUsers(): Promise<User[]> {
    const all = await R.usersDb.fetchAll()
    return all.filter(UserBusiness.isActiveLooking)
  }

  /**
   * Domain-meaningful create that surfaces a typed business error
   * when a duplicate is attempted.
   */
  async register(input: { name: string; email: string }): Promise<User | { duplicate: true }> {
    try {
      return await R.usersDb.create(input)
    } catch (err) {
      if (err instanceof UniqueViolationException) return { duplicate: true }
      throw err
    }
  }
}
