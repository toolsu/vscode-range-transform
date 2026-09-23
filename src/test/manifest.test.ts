import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SCRATCH, SCRATCH_CONTEXT_KEY } from '../const/const'

interface Manifest {
  engines: { vscode: string }
  devDependencies: Record<string, string>
  contributes: {
    commands: { command: string }[]
    menus: Record<string, { command: string; when?: string }[]>
    keybindings: { command: string; when?: string }[]
    configuration: {
      properties: Record<string, { type: string; scope?: string }>
    }
  }
}

const manifest = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
) as Manifest

const { commands, menus, keybindings, configuration } = manifest.contributes

/** Every `when` clause the manifest contains, from menus and keybindings alike. */
const whenClauses = [
  ...Object.values(menus).flatMap((items) => items),
  ...keybindings,
].flatMap((item) => (item.when === undefined ? [] : [item.when]))

/**
 * A file name of the shape `writeScratchFile` produces.
 *
 * Built from {@link SCRATCH} rather than written out, so renaming the prefix without
 * updating the `when` clauses fails here instead of silently hiding the Apply button.
 */
const scratchFileName = `${SCRATCH.filePrefix}mfk2p9-a3z1qd${SCRATCH.fileSuffix}`

describe('contributed settings', () => {
  const properties = configuration.properties

  it('declares a scope on every setting, rather than defaulting to window', () => {
    for (const [key, property] of Object.entries(properties)) {
      expect(property.scope, `${key} has no scope`).toBeDefined()
    }
  })

  // Both are per-document concerns and `readSettings` is called with the document's URI.
  // `language-overridable` rather than `resource` because it is the strict superset:
  // folder settings *and* a `"[markdown]": { … }` block both apply.
  it('scopes the per-document settings so the resource argument means something', () => {
    expect(properties['rangeTransform.defaultSequenceLength'].scope).toBe(
      'language-overridable',
    )
    expect(properties['rangeTransform.preview.maxLength'].scope).toBe(
      'language-overridable',
    )
  })

  it('leaves the input-box setting window-wide', () => {
    expect(properties['rangeTransform.rememberLastInput'].scope).toBe('window')
  })

  it('types the counts as integers', () => {
    expect(properties['rangeTransform.defaultSequenceLength'].type).toBe(
      'integer',
    )
    expect(properties['rangeTransform.preview.maxLength'].type).toBe('integer')
  })
})

describe('when clauses', () => {
  it('only reference commands the manifest declares', () => {
    const declared = new Set(commands.map((command) => command.command))
    for (const item of [...Object.values(menus).flat(), ...keybindings]) {
      expect(declared, `${item.command} is not contributed`).toContain(
        item.command,
      )
    }
  })

  it('uses the context key the extension actually sets', () => {
    const gated = whenClauses.filter((clause) => clause !== 'false')
    expect(gated.length).toBeGreaterThan(0)
    for (const clause of gated) {
      expect(clause).toContain(SCRATCH_CONTEXT_KEY)
    }
  })

  it('hides the internal commands from the command palette', () => {
    const palette = menus.commandPalette ?? []
    const internal = commands
      .map((command) => command.command)
      .filter((command) => command.includes('.internal.'))
    for (const command of internal) {
      const entry = palette.find((item) => item.command === command)
      expect(entry?.when, `${command} is not hidden`).toBe('false')
    }
  })

  // `resourceFilename =~ /…/` is the only part of a `when` clause that can silently stop
  // matching, because nothing type-checks it against the names the extension writes.
  it('matches the file names writeScratchFile produces', () => {
    const patterns = whenClauses.flatMap((clause) => {
      const match = /resourceFilename\s*=~\s*\/(.+?)\/([a-z]*)/.exec(clause)
      return match ? [new RegExp(match[1], match[2])] : []
    })

    expect(patterns.length).toBe(3)
    for (const pattern of patterns) {
      expect(pattern.test(scratchFileName)).toBe(true)
      expect(pattern.test('notes.ts')).toBe(false)
      expect(pattern.test(`prefixed-${scratchFileName}`)).toBe(false)
    }
  })
})

describe('engine declaration', () => {
  it('matches the @types/vscode the sources are compiled against', () => {
    expect(manifest.engines.vscode).toBe(
      `^${manifest.devDependencies['@types/vscode']}`,
    )
  })
})
