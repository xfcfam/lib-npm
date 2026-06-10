import { UsersRepository } from './logic/local/UsersRepository.js'
import { FilesRepository } from './logic/local/FilesRepository.js'

/**
 * Access Layer Injection. Holds the in-memory CRUD stores used by
 * the Business Layer to back the REST API.
 */
export class R {
  private constructor() {}

  static readonly usersRepository = new UsersRepository()
  static readonly filesRepository = new FilesRepository()

  static async init(): Promise<void> {
    await R.usersRepository.init()
    await R.filesRepository.init()
  }

  static async terminate(): Promise<void> {
    await R.filesRepository.terminate()
    await R.usersRepository.terminate()
  }
}
