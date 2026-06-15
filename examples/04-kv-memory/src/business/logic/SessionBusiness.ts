import { StatelessBusiness } from '@xfcfam/xf'
import { R } from '../../repository/R.js'
import type { Session } from '../../repository/transfers/Session.js'

/**
 * Business Logical — session domain rules. It mints sessions, validates
 * them and tracks a login counter, reaching the cache only through the
 * Access injection `R`. It knows nothing about how the store is
 * implemented (in-memory here, Redis in production).
 */
export class SessionBusiness extends StatelessBusiness {
  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}

  /** Create and cache a session for `userId`, bumping the login counter. */
  async login(userId: string): Promise<Session> {
    const session: Session = { userId, token: `tok_${userId}_${Date.now()}`, createdAt: Date.now() }
    await R.sessions.set(session.token, session)
    await R.metrics.increment('logins')
    return session
  }

  /** Resolve the session behind a token, or `undefined` if expired / unknown. */
  async validate(token: string): Promise<Session | undefined> {
    return R.sessions.get(token)
  }

  /** Invalidate a session. Resolves `true` if it existed. */
  async logout(token: string): Promise<boolean> {
    return R.sessions.delete(token)
  }

  /** Running total of logins recorded by {@link login}. */
  async totalLogins(): Promise<number> {
    return (await R.metrics.get('logins')) ?? 0
  }
}
