import { defineConfig } from '@vscode/test-cli'

export default defineConfig({
  // Only the end-to-end suite runs inside the extension host. Everything that does not
  // need `vscode` at runtime lives in `src/test` and runs under `bun test`.
  files: 'out/e2e/**/*.e2e.js',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
  },
})
