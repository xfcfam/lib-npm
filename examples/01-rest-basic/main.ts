import { R } from './src/repository/R.js'
import { B } from './src/business/B.js'
import { A } from './src/api/A.js'

/**
 * Bootstrap of the example artefact.
 *
 * Initialises the three layers bottom-up (R → B → A), runs a couple
 * of demo operations through the Interaction Layer, then shuts the
 * artefact down top-down (A → B → R).
 */
async function main(): Promise<void> {
  console.log('▸ XF artefact starting…')
  await R.init()
  await B.init()
  await A.init()
  console.log('▸ Ready.\n')

  // Demo 1 — fetch one user
  const user = await A.userService.getUser(1)
  console.log(`User #${user.id}: ${user.name} <${user.email}>`)

  // Demo 2 — list active users
  const active = await A.userService.listActiveUsers()
  console.log(`\nActive users: ${active.length}`)
  for (const u of active.slice(0, 3)) {
    console.log(`  • ${u.username} — ${u.email}`)
  }
  if (active.length > 3) console.log(`  …and ${active.length - 3} more.`)

  console.log('\n▸ XF artefact shutting down…')
  await A.terminate()
  await B.terminate()
  await R.terminate()
  console.log('▸ Done.')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
