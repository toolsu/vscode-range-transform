/**
 * Theme colour ids for the inline diff preview.
 *
 * These are `ThemeColor` ids rather than literal rgba values so the preview follows the
 * user's light/dark/high-contrast theme. The two `diffEditor.*TextBackground` colours
 * are registered with `needsTransparency: true`, so the underlying text stays readable.
 */
export const PREVIEW_COLORS = {
  /** Semi-transparent red wash over the text being replaced. */
  removedBackground: 'diffEditor.removedTextBackground',
  /** Semi-transparent green wash behind the replacement. */
  insertedBackground: 'diffEditor.insertedTextBackground',
  /**
   * Foregrounds. `diffEditor.*` registers no foreground colours, and the
   * `gitDecoration.*` ones come from the bundled Git extension and resolve to
   * `transparent` when it is disabled. `charts.red` / `charts.green` are core, tonally
   * matched (`charts.red` is an alias of `editorError.foreground`) and defined for all
   * four theme kinds.
   */
  removedForeground: 'charts.red',
  insertedForeground: 'charts.green',
  errorForeground: 'editorError.foreground',
  /**
   * `diffEditor.*TextBackground` is `null` in high-contrast themes, where these
   * borders are defined instead. Setting both means one of the pair always shows.
   */
  removedBorder: 'diffEditor.removedTextBorder',
  insertedBorder: 'diffEditor.insertedTextBorder',
} as const

/**
 * Substitutions applied to preview text.
 *
 * A decoration's `contentText` is rendered as a CSS `content:'…'` string. VS Code
 * truncates it at the first newline (`contentText.match(/^.*$/m)[0]`) and the editor's
 * `white-space: nowrap` collapses runs of whitespace, so whitespace has to be made
 * visible rather than passed through.
 */
export const PREVIEW_SYMBOLS = {
  newline: '⏎',
  tab: '⇥',
  /** Non-breaking space, so runs of spaces survive CSS whitespace collapsing. */
  space: ' ',
  ellipsis: '…',
  /** Shown in place of a result when the expression threw for that selection. */
  error: '⚠',
} as const
