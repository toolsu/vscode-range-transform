import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateSequence } from '../range/index'

/** Values the fake configuration serves, keyed the way `config.get` asks for them. */
let values: Record<string, unknown> = {}

/** The arguments the last `getConfiguration` call received. */
let lastLookup: { section?: string; scope?: unknown } = {}

// `src/config.ts` is the only module under test that talks to the extension host, and the
// resource argument it passes is exactly what the tests below need to observe.
mock.module('vscode', () => ({
  workspace: {
    getConfiguration(section?: string, scope?: unknown) {
      lastLookup = { section, scope }
      return {
        get(key: string, fallback?: unknown) {
          return key in values ? values[key] : fallback
        },
      }
    },
  },
}))

// Imported after the mock is registered, because the static form would try to resolve
// `vscode` while linking and there is no such package outside the extension host.
type ConfigModule = typeof import('../config.js')
let config: ConfigModule

beforeAll(async () => {
  config = await import('../config.js')
})

const manifest = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
) as {
  contributes: {
    configuration: {
      properties: Record<
        string,
        { type: string; default: number; minimum: number; maximum: number }
      >
    }
  }
}

beforeEach(() => {
  values = {}
  lastLookup = {}
})

describe('readSettings', () => {
  it('falls back to the defaults when nothing is configured', () => {
    expect(config.readSettings()).toEqual({
      defaultSequenceLength: 10,
      previewMaxLength: 120,
      rememberLastInput: true,
    })
  })

  it('passes the resource through, so a folder or language override can apply', () => {
    const uri = { path: '/w/readme.md' }
    config.readSettings(uri as never)
    expect(lastLookup).toEqual({ section: 'rangeTransform', scope: uri })
  })

  it('reads configured values', () => {
    values = {
      defaultSequenceLength: 3,
      'preview.maxLength': 40,
      rememberLastInput: false,
    }
    expect(config.readSettings()).toEqual({
      defaultSequenceLength: 3,
      previewMaxLength: 40,
      rememberLastInput: false,
    })
  })

  it('rounds a fractional count instead of passing it on', () => {
    values = { defaultSequenceLength: 10.5, 'preview.maxLength': 120.4 }
    const settings = config.readSettings()
    expect(settings.defaultSequenceLength).toBe(11)
    expect(settings.previewMaxLength).toBe(120)
  })

  it('clamps to the range the manifest declares', () => {
    values = { defaultSequenceLength: 0, 'preview.maxLength': 1e9 }
    expect(config.readSettings().defaultSequenceLength).toBe(1)
    expect(config.readSettings().previewMaxLength).toBe(10000)
  })

  it('ignores a value that is not a finite number', () => {
    for (const bad of ['12', null, Number.NaN, Infinity, {}]) {
      values = { defaultSequenceLength: bad }
      expect(config.readSettings().defaultSequenceLength).toBe(10)
    }
  })

  // The defect this guards: a fractional length reached `generateNumbers`, which needs a
  // whole count, so every open-ended range came back empty and the user was told their
  // range was unrecognised rather than their setting.
  it('keeps open-ended ranges working when the setting is a fraction', () => {
    values = { defaultSequenceLength: 10.5 }
    const length = config.readSettings().defaultSequenceLength
    for (const spec of ['1:', 'a:', 'Mon:', '2023-01-01:']) {
      expect(generateSequence(spec, 1, length)).toHaveLength(11)
    }
  })
})

describe('NUMBER_SETTINGS', () => {
  it('mirrors the bounds declared in package.json', () => {
    const properties = manifest.contributes.configuration.properties
    for (const key of Object.keys(
      config.NUMBER_SETTINGS,
    ) as (keyof ConfigModule['NUMBER_SETTINGS'])[]) {
      const bounds = config.NUMBER_SETTINGS[key]
      const declared = properties[`rangeTransform.${key}`]
      expect(declared).toBeDefined()
      expect(declared.type).toBe('integer')
      expect(declared.default).toBe(bounds.fallback)
      expect(declared.minimum).toBe(bounds.minimum)
      expect(declared.maximum).toBe(bounds.maximum)
    }
  })
})
