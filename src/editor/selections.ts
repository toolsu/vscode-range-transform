import * as vscode from 'vscode'
import type { SelectionSnapshot } from '../transform/vars'

/**
 * Sorts selections into document order.
 *
 * `TextEditor.selections` comes back in the order the user created the cursors, which
 * makes `i`, `li` and `ss` depend on click order — surprising, and not reproducible.
 * Every part of the extension works from this ordering instead.
 */
export function orderSelections(
  selections: readonly vscode.Selection[],
): vscode.Selection[] {
  return [...selections].sort((a, b) => a.start.compareTo(b.start))
}

/**
 * Extracts everything a transform needs from the editor, as plain data.
 *
 * This is the boundary where `vscode` stops: nothing under `src/transform` or
 * `src/range` imports it, which is what lets those modules be tested without an
 * extension host.
 */
export function snapshotSelections(
  document: vscode.TextDocument,
  ordered: readonly vscode.Selection[],
): SelectionSnapshot {
  return {
    texts: ordered.map((selection) => document.getText(selection)),
    wholeLines: ordered.map(
      (selection) => document.lineAt(selection.start.line).text,
    ),
    startLines: ordered.map((selection) => selection.start.line),
  }
}
