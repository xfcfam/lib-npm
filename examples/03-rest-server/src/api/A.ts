import { UsersRestService } from './logic/service/UsersRestService.js'
import { FilesRestService } from './logic/service/FilesRestService.js'
import { HealthRestService } from './logic/service/HealthRestService.js'
import { ChatWebSocketService } from './logic/service/ChatWebSocketService.js'
import { ClockSseService } from './logic/service/ClockSseService.js'
import { ApiGraphQLService } from './logic/service/ApiGraphQLService.js'

/**
 * Interaction Layer Injection.
 *
 * Each entry-point Logical is declared as `static readonly` — the
 * canonical XF pattern. Each service registers itself on `B.server`
 * from within its `init()` call (push model). The server orchestrator
 * (`B.server`) is owned by the Business Layer.
 *
 * Four entry-point shapes share the one server / port:
 *   - REST       (`UsersRestService`, `FilesRestService`, `HealthRestService`)
 *   - SSE        (`ClockSseService` — plain HTTP stream via `SseUtils`)
 *   - WebSocket  (`ChatWebSocketService` — `B.server.ws`)
 *   - GraphQL    (`ApiGraphQLService` — `B.server.graphql`)
 */
export class A {
  private constructor() {}

  static readonly usersService   = new UsersRestService()
  static readonly filesService   = new FilesRestService()
  static readonly healthService  = new HealthRestService()
  static readonly clockService   = new ClockSseService()
  static readonly chatService    = new ChatWebSocketService()
  static readonly graphqlService = new ApiGraphQLService()

  static async init(): Promise<void> {
    await A.usersService.init()    // GET/POST/PUT/DELETE /users
    await A.filesService.init()    // GET/POST /files (+ multipart, downloads, SSE)
    await A.healthService.init()   // GET /health, GET /ping
    await A.clockService.init()    // GET /clock (Server-Sent Events)
    await A.chatService.init()     // WS /chat
    await A.graphqlService.init()  // POST /graphql (+ GraphiQL)
  }

  static async terminate(): Promise<void> {
    await A.graphqlService.terminate()
    await A.chatService.terminate()
    await A.clockService.terminate()
    await A.healthService.terminate()
    await A.filesService.terminate()
    await A.usersService.terminate()
  }
}
