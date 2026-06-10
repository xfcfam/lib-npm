import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  // Tests run against the TypeScript source of the workspace peer dep,
  // not its built `./dist`. Avoids requiring `pnpm build` before
  // `pnpm test`.
  resolve: {
    alias: {
      '@xfcfam/xf': fileURLToPath(new URL('../xf/index.ts', import.meta.url)),
    },
  },
})
