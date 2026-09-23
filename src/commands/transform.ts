import * as vscode from 'vscode'
import { readSettings } from '../config'
import { TEXT } from '../const/text'
import type { PreviewItem } from '../editor/preview'
import { orderSelections, snapshotSelections } from '../editor/selections'
import { runTransform, type TransformResult } from '../transform'
import {
  runInputFlow,
  type ComputeOutcome,
  type Computation,
} from './inputFlow'

const HISTORY_KEY = 'rangeTransform.lastExpression'

/**
 * Turns a transform result into replacements.
 *
 * A selection whose expression threw becomes `null` — left exactly as it was, rather
 * than emptied or filled with an error marker. Reporting the count separately lets the
 * caller warn without blocking the selections that did work.
 */
export function toComputation(result: TransformResult): ComputeOutcome {
  if (!result.ok) {
    return { ok: false, message: result.message }
  }

  const replacements: (string | null)[] = []
  const previews: PreviewItem[] = []
  let failures = 0
  let firstFailureMessage: string | undefined

  for (const item of result.items) {
    if (item.ok) {
      replacements.push(item.text)
      previews.push({ kind: 'replace', text: item.text })
    } else {
      replacements.push(null)
      // Here `null` really does mean the expression threw, so the preview warns.
      previews.push({ kind: 'error' })
      failures += 1
      firstFailureMessage ??= item.message
    }
  }

  const computation: Computation = {
    replacements,
    previews,
    failures,
    firstFailureMessage,
  }
  return { ok: true, computation }
}

export async function transformCommand(
  decorationType: vscode.TextEditorDecorationType,
  memento: vscode.Memento,
): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    void vscode.window.showErrorMessage(TEXT.noActiveEditor)
    return
  }

  const ordered = orderSelections(editor.selections)
  if (ordered.length === 0) {
    void vscode.window.showErrorMessage(TEXT.noSelections)
    return
  }

  const settings = readSettings(editor.document.uri)
  const snapshot = snapshotSelections(editor.document, ordered)

  await runInputFlow(editor, ordered, decorationType, memento, {
    title: TEXT.transformTitle,
    prompt: TEXT.transformPrompt,
    placeholder: TEXT.transformPlaceholder,
    emptyMessage: TEXT.transformEmpty,
    historyKey: HISTORY_KEY,
    rememberLastInput: settings.rememberLastInput,
    previewMaxLength: settings.previewMaxLength,
    compute: (value) => toComputation(runTransform(snapshot, value)),
  })
}
