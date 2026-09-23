import * as vscode from 'vscode'
import { TEXT } from '../const/text'
import { normalizeEol, planRanges } from './plan'

/**
 * Replaces each selection with its result, in a single edit.
 *
 * One `TextEditor.edit` call means one undo step for the whole command, which is what
 * users expect from something that rewrites twenty places at once.
 *
 * `replacements` is in document order alongside `ordered`; `null` leaves that selection
 * untouched. Returns how many selections were actually rewritten, or `undefined` if the
 * edit did not happen — in which case the user has already been told why, because an
 * edit that silently does nothing is indistinguishable from pressing Escape.
 */
export async function applyReplacements(
  editor: vscode.TextEditor,
  ordered: readonly vscode.Selection[],
  replacements: readonly (string | null)[],
): Promise<number | undefined> {
  const document = editor.document
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'

  const originals = ordered.map((selection) => ({
    start: document.offsetAt(selection.start),
    end: document.offsetAt(selection.end),
  }))
  const originalTexts = ordered.map((selection) => document.getText(selection))

  // Insert and measure the *same* string. VS Code rewrites the line endings of anything
  // handed to an edit, so a `\n` from user code becomes two characters in a CRLF
  // document; doing the rewrite here keeps `planRanges` counting what really lands, and
  // stops a mixed-line-ending replacement being written into the document in the first
  // place.
  const normalized = replacements.map((replacement) =>
    replacement === null || replacement === undefined
      ? null
      : normalizeEol(replacement, eol),
  )

  let changed = 0
  let applied: boolean
  try {
    applied = await editor.edit((builder) => {
      ordered.forEach((selection, index) => {
        const replacement = normalized[index]
        if (replacement === null) {
          return
        }
        if (replacement === originalTexts[index]) {
          return
        }
        builder.replace(selection, replacement)
        changed += 1
      })
    })
  } catch (error) {
    // `edit` rejects rather than resolving `false` when the editor has been closed
    // ("TextEditor#edit not possible on closed editors"). Left uncaught it surfaces as
    // VS Code's generic "Running the contributed command … failed".
    void vscode.window.showErrorMessage(
      TEXT.editFailed(error instanceof Error ? error.message : String(error)),
    )
    return undefined
  }

  if (!applied) {
    // VS Code refuses the edit when the document version moved underneath it.
    void vscode.window.showWarningMessage(TEXT.editRejected)
    return undefined
  }

  // Leave the results selected so commands can be chained: fill a range, then transform
  // what it produced without re-selecting anything.
  const planned = planRanges(originals, normalized, originalTexts)
  editor.selections = planned.map(
    (range) =>
      new vscode.Selection(
        document.positionAt(range.start),
        document.positionAt(range.end),
      ),
  )

  return changed
}
