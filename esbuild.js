const esbuild = require('esbuild')
const Module = require('node:module')
const path = require('node:path')
const fs = require('node:fs')

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')
const check = process.argv.includes('--check')

const OUTFILE = 'dist/extension.js'

/**
 * Reports build results in the format the `connor4312.esbuild-problem-matchers`
 * extension understands, so `watch:esbuild` can drive the F5 launch task.
 *
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started')
    })
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`)
        if (location) {
          console.error(
            `    ${location.file}:${location.line}:${location.column}:`,
          )
        }
      })
      console.log('[watch] build finished')
    })
  },
}

/**
 * Everything that decides how the code behaves, shared by the extension bundle and by
 * the smoke-check probe below.
 *
 * Keeping the two in one object is the point: the probe is only evidence about the
 * shipped artifact if it was compiled with the same options, and the reason this file
 * needed a smoke check at all is that the production settings were never executed.
 *
 * @type {import('esbuild').BuildOptions}
 */
const sharedOptions = {
  bundle: true,
  format: 'cjs',
  platform: 'node',
  // Matches the Node version shipped inside VS Code 1.103.
  target: 'node20',
  // `vscode` is injected by the extension host, never bundled.
  external: ['vscode'],
  minify: production,
  // Unconditional, and load-bearing rather than cosmetic. `minifyIdentifiers` rewrites
  // `Function.prototype.name`, and `src/transform/toStr.ts` renders a function the user
  // mentioned but never called as `[Function: ${fn.name}]` — the signal that they forgot
  // the call. Without this, `convnum.toBase` came out of a production build as
  // `[Function: Nr]`. Setting it in every mode keeps dev and prod behaviour identical,
  // which is what stops the difference from hiding again.
  keepNames: true,
  sourcesContent: false,
}

/**
 * The extension bundle proper.
 *
 * @type {import('esbuild').BuildOptions}
 */
const extensionOptions = {
  ...sharedOptions,
  entryPoints: ['src/extension.ts'],
  outfile: OUTFILE,
  sourcemap: !production,
  logLevel: 'silent',
  plugins: [esbuildProblemMatcherPlugin],
}

/**
 * A module compiled with {@link sharedOptions} that reports the three facts a minifier
 * can silently break.
 *
 * It is compiled from a string rather than a file because it is build-time scaffolding,
 * not source: nothing else should be able to import it, and it must not end up in the
 * VSIX. `convertTo` is the anchor because `src/range/index.ts` imports it, so it cannot
 * disappear from convnum without the build failing first, and its arity of 2 keeps it
 * out of the auto-call registry — exactly the case that renders as `[Function: …]`.
 */
const PROBE_SOURCE = `
import * as convnum from 'convnum'
import { argKindOf, registerConvnum } from './src/transform/argKind'
import { toStr } from './src/transform/toStr'

const namespace = convnum as unknown as Record<string, unknown>
registerConvnum(namespace)

export const probe = {
  unregistered: toStr(namespace.convertTo),
  numberTaking: argKindOf(namespace.toRoman),
  stringTaking: argKindOf(namespace.getTypes),
}
`

/** Loads `file` with a stub standing in for the extension host's `vscode` module. */
function loadWithStubbedVscode(file) {
  // `Module._load` is private, but it is the only interception point that covers a
  // `require('vscode')` buried inside an already-bundled file. The patch is undone in
  // the `finally`, so nothing else in this process sees it.
  const load = Module._load
  const stub = new Proxy(
    {},
    { get: () => new Proxy(function () {}, { get: () => undefined }) },
  )

  Module._load = function (request, parent, isMain) {
    return request === 'vscode'
      ? stub
      : load.call(this, request, parent, isMain)
  }

  try {
    return require(file)
  } finally {
    Module._load = load
  }
}

/**
 * Asserts the invariants that only hold for a *built* bundle, so the artifact users
 * install stops being the one thing no test ever runs.
 *
 * `bun test` type-checks and exercises the TypeScript sources directly and `test:e2e`
 * runs the unminified build, which is how a production-only defect — names destroyed by
 * `minifyIdentifiers` — shipped unnoticed. Wired into `vscode:prepublish`, so packaging
 * fails rather than producing a broken VSIX.
 *
 * @returns {Promise<void>} rejects listing every invariant that failed, so one run
 * reports all of them rather than only the first.
 */
async function smokeCheck() {
  const failures = []
  const expect = (condition, message) => {
    if (!condition) {
      failures.push(message)
    }
  }

  const outfile = path.resolve(__dirname, OUTFILE)
  expect(fs.existsSync(outfile), `${OUTFILE} was not produced`)
  if (!fs.existsSync(outfile)) {
    throw new Error(failures.join('\n'))
  }

  const source = fs.readFileSync(outfile, 'utf8')
  expect(source.length > 0, `${OUTFILE} is empty`)
  expect(
    source.includes('require("vscode")'),
    '`vscode` was bundled or shimmed away instead of left external',
  )
  if (production) {
    expect(
      !source.includes('sourceMappingURL'),
      'the production bundle points at a source map that is not shipped',
    )
  }

  const bundle = loadWithStubbedVscode(outfile)
  expect(
    typeof bundle.activate === 'function',
    'the bundle does not export `activate`',
  )
  expect(
    typeof bundle.deactivate === 'function',
    'the bundle does not export `deactivate`',
  )

  const built = await esbuild.build({
    ...sharedOptions,
    stdin: {
      contents: PROBE_SOURCE,
      resolveDir: __dirname,
      sourcefile: 'bundle-probe.ts',
      loader: 'ts',
    },
    outfile: 'dist/bundle-probe.js',
    write: false,
    logLevel: 'warning',
  })

  const probeModule = { exports: {} }
  new Function('exports', 'module', 'require', built.outputFiles[0].text)(
    probeModule.exports,
    probeModule,
    require,
  )
  const { probe } = probeModule.exports

  expect(
    probe.unregistered === '[Function: convertTo]',
    `function names do not survive the build: convnum.convertTo renders as ${probe.unregistered}`,
  )
  expect(
    probe.numberTaking === 'n' && probe.stringTaking === 's',
    `the auto-call registry does not survive the build: toRoman=${probe.numberTaking}, getTypes=${probe.stringTaking}`,
  )

  if (failures.length > 0) {
    throw new Error(
      `bundle smoke check failed:\n  - ${failures.join('\n  - ')}`,
    )
  }

  const kb = (fs.statSync(outfile).size / 1024).toFixed(1)
  console.log(`bundle smoke check passed (${OUTFILE}, ${kb} kb)`)
}

async function main() {
  const ctx = await esbuild.context(extensionOptions)

  if (watch) {
    await ctx.watch()
    return
  }

  await ctx.rebuild()
  await ctx.dispose()

  if (check) {
    await smokeCheck()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
