import { StatelessView } from '@xfcfam/xf'
import { B } from '../../../business/B.js'
import type { User } from '../../../repository/transfers/User.js'

/**
 * Interaction Layer Logical — the user-facing service.
 *
 * Stateless — extends `StatelessView`. Calls into the Business
 * Layer via `B.userBusiness`.
 */
export class UserService extends StatelessView {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  async getUser(id: number): Promise<User>  { return B.userBusiness.getUser(id) }
  async listActiveUsers(): Promise<User[]>  { return B.userBusiness.listActiveUsers() }
  async register(input: { name: string; email: string }) { return B.userBusiness.register(input) }
}
