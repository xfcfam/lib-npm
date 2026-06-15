import { XF } from './src/XF.js'
import { A } from './src/api/A.js'
import { R } from './src/repository/R.js'

/**
 * Entry point — lives OUTSIDE the artefact root (`src/`). It drives the
 * lifecycle via `XF` and calls into the Interaction injection `A`.
 *
 * Watch the console: every line is JSON (the logger's `format`), warns go
 * to stderr, the service's `debug` line never appears (the `info` policy),
 * and the same records are mirrored to rotating files under `./logs`.
 */
async function main(): Promise<void> {
  await XF.init()

  console.log('\n--- greetings ---')
  console.log(A.greeter.greet('Ada'))
  console.log(A.greeter.greet('Linus'))
  console.log(A.greeter.greet('')) // triggers a warn from the Business layer

  // emit enough to make the file tree rotate (maxBytes = 256)
  for (let i = 0; i < 8; i++) A.greeter.greet(`user-${i}`)

  await R.logger.flush() // settle background file writes before reading

  const entries = await R.logFile.list('logs')
  console.log('\n--- rotated log files under ./logs ---')
  for (const e of entries.filter((x) => x.isFile)) console.log('  ', e.name)

  await XF.terminate()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
