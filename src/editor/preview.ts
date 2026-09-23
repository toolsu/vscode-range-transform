import * as vscode from 'vscode'
import { PREVIEW_COLORS, PREVIEW_SYMBOLS } from '../const/visual'

/**
 * What one selection's preview should show.
 *
 * Three states rather than "text or nothing", because "there is nothing to do here" and
 * "the expression threw" look nothing alike to a user and used to share `null`: an
 * `insertSequence` with more cursors than values marked the surplus cursors with the
 * error warning, in a command where no expression was ever typed.
 */
export type PreviewItem =
  | { readonly kind: 'replace'; readonly text: string }
  | { readonly kind: 'skip' }
  | { readonly kind: 'error' }

/**
 * Creates the decoration type used by all three commands.
 *
 * A single type is enough. VS Code compiles the range-level properties and the `after`
 * attachment into separate CSS rules attached to different elements, so the red wash
 * over the original and the green wash behind the replacement never collide — only the
 * `after.contentText` has to vary per selection, and that is the one field
 * `DecorationOptions.renderOptions` accepts.
 *
 * The outline colours only resolve in high-contrast themes, where the two background
 * colours are deliberately undefined; setting both means the diff stays legible in
 * every theme kind.
 */
export function createPreviewDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor(PREVIEW_COLORS.removedBackground),
    color: new vscode.ThemeColor(PREVIEW_COLORS.removedForeground),
    textDecoration: 'line-through',
    outlineColor: new vscode.ThemeColor(PREVIEW_COLORS.removedBorder),
    outlineStyle: 'solid',
    outlineWidth: '1px',
    after: {
      backgroundColor: new vscode.ThemeColor(PREVIEW_COLORS.insertedBackground),
      color: new vscode.ThemeColor(PREVIEW_COLORS.insertedForeground),
      borderColor: new vscode.ThemeColor(PREVIEW_COLORS.insertedBorder),
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  })
}

/**
 * Makes text safe to hand to a decoration's `contentText`.
 *
 * That string becomes a CSS `content:'…'` value, which brings two silent failure modes:
 * VS Code keeps only the first line (`contentText.match(/^.*$/m)[0]`), and the editor's
 * `white-space: nowrap` collapses runs of whitespace. Both would make the preview
 * disagree with what actually gets inserted, so whitespace is shown rather than passed
 * through.
 */
export function sanitizePreviewText(text: string, maxLength: number): string {
  const visible = text
    .replace(/\r\n|\r|\n/g, PREVIEW_SYMBOLS.newline)
    .replace(/\t/g, PREVIEW_SYMBOLS.tab)
    .replace(/ /g, PREVIEW_SYMBOLS.space)

  return [...visible].length > maxLength
    ? [...visible].slice(0, maxLength).join('') + PREVIEW_SYMBOLS.ellipsis
    : visible
}

/**
 * Paints the inline diff.
 *
 * Selections whose result is identical to what is already there are skipped, as are
 * `skip` items, so a partially-matching expression — or a sequence that ran out before
 * the cursors did — shows only what it would actually change.
 *
 * Decorations render on any *visible* editor, focused or not, which is what lets the
 * advanced editor preview into the original document while the user types in the
 * column beside it. If the editor is not visible the call is silently dropped by
 * VS Code — no error, no queueing.
 */
export function renderPreview(
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType,
  ordered: readonly vscode.Selection[],
  items: readonly PreviewItem[],
  maxLength: number,
): void {
  const decorations: vscode.DecorationOptions[] = []

  ordered.forEach((selection, index) => {
    const item = items[index]
    if (item === undefined || item.kind === 'skip') {
      return
    }

    if (item.kind === 'error') {
      decorations.push({
        range: selection,
        hoverMessage: 'The expression threw for this selection.',
        renderOptions: { after: { contentText: PREVIEW_SYMBOLS.error } },
      })
      return
    }

    const original = editor.document.getText(selection)
    if (item.text === original) {
      return
    }

    decorations.push({
      range: selection,
      renderOptions: {
        after: { contentText: sanitizePreviewText(item.text, maxLength) },
      },
    })
  })

  editor.setDecorations(decorationType, decorations)
}

/** Removes every preview decoration from the editor. */
export function clearPreview(
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType,
): void {
  editor.setDecorations(decorationType, [])
}
