import { R } from './src/repository/R.js'
import { B } from './src/business/B.js'
import { A } from './src/api/A.js'

/**
 * Bootstrap of the example artefact.
 *
 * Boots R → B → A, runs a short scenario against the local Postgres
 * loaded from `schema.sql`, then tears down A → B → R.
 *
 * Connection string defaults to `postgres://xf:xf@localhost:5432/xfdemo`
 * (matching `docker-compose.yml`). Override with the `DATABASE_URL`
 * env var.
 */
async function main(): Promise<void> {
  console.log('▸ XF artefact starting…')
  await R.init()
  await B.init()
  await A.init()
  console.log('▸ Ready.\n')

  // Demo 1 — fetch one user
  const alice = await A.userService.getUser(1)
  console.log(`Fetched user #${alice.id}: ${alice.name} <${alice.email}>`)
  console.log(`Created at: ${alice.createdAt.toISOString()}\n`)

  // Demo 2 — list active users (domain rule applied in Business)
  const active = await A.userService.listActiveUsers()
  console.log(`Active-looking users: ${active.length}`)
  for (const u of active) {
    console.log(`  • ${u.name.padEnd(10)} ${u.email}`)
  }
  console.log()

  // Demo 3 — register a new user (success path)
  const fresh = `dora-${Date.now()}@example.com`
  const reg1 = await A.userService.register({ name: 'Dora', email: fresh })
  if ('duplicate' in reg1) {
    console.log('Register returned duplicate (unexpected on success path).')
  } else {
    console.log(`Registered: #${reg1.id} ${reg1.name} <${reg1.email}>\n`)
  }

  // Demo 4 — register again with the same email (UniqueViolation path)
  const reg2 = await A.userService.register({ name: 'Dora-again', email: fresh })
  if ('duplicate' in reg2) {
    console.log(`Register correctly refused duplicate email.\n`)
  } else {
    console.log(`Unexpected success on duplicate insert: #${reg2.id}`)
  }

  console.log('▸ XF artefact shutting down…')
  await A.terminate()
  await B.terminate()
  await R.terminate()
  console.log('▸ Done.')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
