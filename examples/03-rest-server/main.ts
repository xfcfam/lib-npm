import { XF } from './src/XF.js'
import { B } from './src/business/B.js'

/**
 * Bootstrap of the 03-rest-server example.
 *
 * Orchestration:
 *   1. `XF.init()` — initialises R → B → A bottom-up. Services register
 *      their routes on `B.server` inside their own `init()` calls.
 *   2. `B.server.listen()` — starts the Fastify server after all routes
 *      are registered. Kept outside `XF.init()` so the canonical XF
 *      element stays delegation-only.
 *   3. On SIGTERM / SIGINT: `B.server.close()` drains in-flight requests,
 *      then `XF.terminate()` shuts down layers top-down (A → B → R).
 */
async function main(): Promise<void> {
  await XF.init()
  await B.server.listen()

  // Graceful shutdown on SIGTERM / SIGINT.
  let shuttingDown = false
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('\n▸ Shutting down…')
    await B.server.close()
    await XF.terminate()
    console.log('▸ Done.')
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown())
  process.on('SIGINT',  () => void shutdown())
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
