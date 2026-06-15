import { XF } from './src/XF.js'
import { A } from './src/api/A.js'

/**
 * Entry point — lives OUTSIDE the artefact root (`src/`). It only drives
 * the lifecycle via `XF` and calls into the Interaction injection `A`.
 */
async function main(): Promise<void> {
  await XF.init()

  const ada = await A.sessions.login('ada')
  const linus = await A.sessions.login('linus')
  console.log(`logged in: ${ada.userId}  token=${ada.token}`)

  const found = await A.sessions.validate(ada.token)
  console.log(`validate(ada): ${found ? found.userId : 'EXPIRED/UNKNOWN'}`)

  await A.sessions.logout(linus.token)
  const gone = await A.sessions.validate(linus.token)
  console.log(`after logout(linus): ${gone ? gone.userId : 'gone'}`)

  console.log(`total logins: ${await A.sessions.stats()}`)

  await XF.terminate()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
