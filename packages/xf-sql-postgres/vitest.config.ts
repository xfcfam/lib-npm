import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@xfcfam/xf':     fileURLToPath(new URL('../xf/index.ts',     import.meta.url)),
      '@xfcfam/xf-sql': fileURLToPath(new URL('../xf-sql/index.ts', import.meta.url)),
    },
  },
})
