import * as vscode from 'vscode'
import {
  DEFAULT_PREVIEW_MAX_LENGTH,
  DEFAULT_SEQUENCE_LENGTH,
} from './const/const'

/** The extension's settings, resolved once per command invocation. */
export interface Settings {
  readonly defaultSequenceLength: number
  readonly previewMaxLength: number
  readonly rememberLastInput: boolean
}

/** What a numeric setting is repaired against when the configured value is unusable. */
interface Bounds {
  readonly fallback: number
  readonly minimum: number
  readonly maximum: number
}

/**
 * The numeric settings and the bounds package.json declares for them.
 *
 * Duplicated from the manifest deliberately, and kept honest by
 * `src/test/manifest.test.ts`. The JSON schema in `contributes.configuration` only drives
 * the settings *editor*: a hand-edited `settings.json` reaches `get()` exactly as
 * written, squiggle and all, so the values have to be repaired here as well.
 */
export const NUMBER_SETTINGS = {
  defaultSequenceLength: {
    fallback: DEFAULT_SEQUENCE_LENGTH,
    minimum: 1,
    maximum: 10000,
  },
  'preview.maxLength': {
    fallback: DEFAULT_PREVIEW_MAX_LENGTH,
    minimum: 10,
    maximum: 10000,
  },
} as const satisfies Record<string, Bounds>

/**
 * Reads one numeric setting, rounding and clamping it into the declared range.
 *
 * A fraction is the case that motivated this. Both settings are counts, and
 * `defaultSequenceLength: 10.5` used to flow into `generateNumbers`, which needs a whole
 * count and returns nothing for anything else — so every open-ended range (`1:`, `a:`,
 * `Mon:`, `2023-01-01:`) failed with "not a range this extension understands" and blamed
 * the range rather than the setting. Repairing rather than rejecting matches what
 * `normalize` does with a half-typed range: the user gets a plausible result instead of
 * an error about something they did not touch.
 */
function readNumber(
  config: vscode.WorkspaceConfiguration,
  key: keyof typeof NUMBER_SETTINGS,
): number {
  const { fallback, minimum, maximum } = NUMBER_SETTINGS[key]
  const value = config.get<number>(key)

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

/**
 * Reads settings for the document being edited.
 *
 * The resource is what selects the right value for `defaultSequenceLength` and
 * `preview.maxLength`: both are declared `language-overridable` in package.json, so a
 * folder setting in a multi-root workspace or a `"[markdown]": { … }` block applies to
 * them, and neither can be resolved without knowing which document is being edited.
 *
 * `rememberLastInput` is window-scoped, so the resource is ignored for it — the input box
 * belongs to the window, not to whichever file happens to be open. Passing a resource is
 * still correct; VS Code simply resolves that one key the same way for every document.
 */
export function readSettings(scope?: vscode.Uri): Settings {
  const config = vscode.workspace.getConfiguration('rangeTransform', scope)
  return {
    defaultSequenceLength: readNumber(config, 'defaultSequenceLength'),
    previewMaxLength: readNumber(config, 'preview.maxLength'),
    rememberLastInput: config.get('rememberLastInput', true),
  }
}
