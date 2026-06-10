import { RestServerService } from '@xfcfam/xf-server'
import { UsersRestService } from './logic/service/UsersRestService.js'
import { FilesRestService } from './logic/service/FilesRestService.js'
import { HealthRestService } from './logic/service/HealthRestService.js'
import { AppServerService } from './logic/service/AppServerService.js'

/**
 * Interaction Layer Injection.
 *
 * Each REST-exposing Logical is declared as `static readonly` — the
 * canonical XF pattern. The server orchestrator (`AppServerService`)
 * receives a lazy callback that, when invoked at init() time, calls
 * `RestServerService.discover(A)` to introspect the static fields of
 * `A` and return every `RestService` instance among them. Zero
 * boilerplate: declare a service once, the server picks it up.
 */
export class A {
  private constructor() {}

  static readonly usersService  = new UsersRestService()
  static readonly filesService  = new FilesRestService()
  static readonly healthService = new HealthRestService()
  static readonly server        = new AppServerService(() => RestServerService.discover(A))

  static async init(): Promise<void> {
    await A.usersService.init()
    await A.filesService.init()
    await A.healthService.init()
    await A.server.init()    // starts the HTTP server
  }

  static async terminate(): Promise<void> {
    await A.server.terminate()
    await A.healthService.terminate()
    await A.filesService.terminate()
    await A.usersService.terminate()
  }
}
