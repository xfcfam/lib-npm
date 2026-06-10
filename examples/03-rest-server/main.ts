import { XF } from './src/XF.js'

/**
 * Bootstrap of the 03-rest-server example.
 *
 * The artefact has an `XF` orchestrator that initialises Access →
 * Business → Interaction. The Interaction layer starts a Fastify
 * server on port 3000 and registers every `RestService` declared on
 * `A` via `RestServerService.discover(A)`.
 *
 * Press Ctrl-C to terminate; `XF.terminate()` shuts the server
 * gracefully so in-flight requests complete.
 */
async function main(): Promise<void> {
  await XF.init()

  // Graceful shutdown on SIGTERM / SIGINT.
  let shuttingDown = false
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('\n▸ Shutting down…')
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
