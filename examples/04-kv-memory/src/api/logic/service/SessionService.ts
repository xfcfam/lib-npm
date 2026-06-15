import { StatelessService } from '@xfcfam/xf'
import { B } from '../../../business/B.js'
import type { Session } from '../../../repository/transfers/Session.js'

/**
 * Interaction Logical (systemic) — the entry point an external actor
 * (here, `main`) calls. It only delegates to the Business layer through
 * the injection `B`; it holds no domain logic of its own.
 */
export class SessionService extends StatelessService {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  async login(userId: string): Promise<Session> {
    return B.session.login(userId)
  }

  async validate(token: string): Promise<Session | undefined> {
    return B.session.validate(token)
  }

  async logout(token: string): Promise<boolean> {
    return B.session.logout(token)
  }

  async stats(): Promise<number> {
    return B.session.totalLogins()
  }
}
