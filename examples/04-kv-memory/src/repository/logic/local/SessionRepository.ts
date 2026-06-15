import { MemoryKeyValueRepository } from '../../general/MemoryKeyValueRepository.js'
import type { Session } from '../../transfers/Session.js'

/**
 * Access Logical — the session cache. Keys are session tokens; values
 * are {@link Session} objects, JSON-encoded by the default codec and
 * expiring after one hour. Named by **domain** with the canonical
 * `Repository` suffix (not `SessionStore`).
 */
export class SessionRepository extends MemoryKeyValueRepository<Session> {
  constructor() {
    super({ namespace: 'sess', defaultTtl: 3600 })
  }

  override async init(): Promise<void> {}
  override async terminate(): Promise<void> {}
}
