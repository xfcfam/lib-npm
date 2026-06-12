import { UsersDbRepository } from './logic/local/UsersDbRepository.js'

/**
 * Access Layer Injection — canonical XF singleton.
 *
 * Holds every Access Logical of this artefact and orchestrates their
 * lifecycle. External code reaches Logicals via the canonical pattern
 * `R.usersDb.fetchById(1)`.
 */
export class R {
  private constructor() {}

  static readonly usersDb = new UsersDbRepository()

  static async init(): Promise<void> {
    await R.usersDb.init()
  }

  static async terminate(): Promise<void> {
    await R.usersDb.terminate()
  }
}
