import { UsersRestRepository } from './logic/remote/UsersRestRepository.js'

/**
 * Access Layer Injection — canonical XF singleton.
 *
 * Static-only, non-instantiable. Holds every Access Logical of the
 * artefact and orchestrates their lifecycle.
 *
 * Access pattern from outside the layer:  `R.usersRest.fetchUser(1)`.
 */
export class R {
  private constructor() {}

  static readonly usersRest = new UsersRestRepository()

  static async init(): Promise<void> {
    await R.usersRest.init()
  }

  static async terminate(): Promise<void> {
    await R.usersRest.terminate()
  }
}
