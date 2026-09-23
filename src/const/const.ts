/** Fallback sequence length when there is a single cursor and the range has no stop. */
export const DEFAULT_SEQUENCE_LENGTH = 10

/** Fallback for `rangeTransform.preview.maxLength`. */
export const DEFAULT_PREVIEW_MAX_LENGTH = 120

/**
 * The scratch directory used by "Transform Selections (Advanced)".
 *
 * It lives under `ExtensionContext.globalStorageUri` rather than `os.tmpdir()`, so the
 * files survive a crash, are not world-readable, cannot be swept away mid-session by
 * the OS, and are removed automatically when the extension is uninstalled.
 */
export const SCRATCH = {
  /**
   * Prefix of every scratch file. The `editor/title` menu and the `ctrl+enter`
   * keybinding match on it via `resourceFilename =~ /^rt-transform-/`, so changing it
   * means changing those `when` clauses in `package.json` too.
   */
  filePrefix: 'rt-transform-',
  fileSuffix: '.ts',
  /** Ambient declarations for `s`, `n`, `i`, ... — written next to the scratch file. */
  globalsFileName: 'rt.d.ts',
  /** convnum's declarations, so `typeof import('./convnum')` in `rt.d.ts` resolves. */
  convnumFileName: 'convnum.d.ts',
  /** Scratch files older than this are swept on activation. */
  maxAgeMs: 24 * 60 * 60 * 1000,
  /** Pre-filled expression: the identity transform. */
  placeholder: 's',
} as const

/** Context key that gates the scratch editor's title buttons and `ctrl+enter`. */
export const SCRATCH_CONTEXT_KEY = 'rangeTransform.scratchOpen'

/** Debounce for recomputing the preview while typing in an input box. */
export const PREVIEW_DEBOUNCE_MS = 60

/** Debounce for recomputing the preview while typing in the scratch editor. */
export const SCRATCH_PREVIEW_DEBOUNCE_MS = 200

/**
 * Debounce for auto-saving the scratch file.
 *
 * Keeping the document clean means closing its tab does not raise the "do you want to
 * save the changes?" modal for a file the user never knowingly created. Short, because
 * the window it leaves open is exactly the window in which that modal can still appear;
 * the session also flushes the save whenever the scratch editor stops being active.
 */
export const SCRATCH_SAVE_DEBOUNCE_MS = 150
