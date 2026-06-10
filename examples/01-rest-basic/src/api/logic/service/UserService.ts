import { StatelessView } from '@xfcfam/xf'
import { B } from '../../../business/B'
import type { User } from '../../../repository/transfers/User'

/**
 * Interaction Layer Logical for the User service.
 *
 * In a CLI-style example, the "interaction" is the console. The
 * service exposes methods that the bootstrap (main.ts) can call and
 * receives Transfer objects from the Business layer to format /
 * route.
 *
 * Extends `StatelessView` because the service holds no state of its
 * own — its job is purely orchestration of Business operations.
 */
export class UserService extends StatelessView {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  async getUser(id: number): Promise<User> {
    return B.userBusiness.getUser(id)
  }

  async listActiveUsers(): Promise<User[]> {
    return B.userBusiness.listActiveUsers()
  }
}
