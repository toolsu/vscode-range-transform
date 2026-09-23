import * as vscode from 'vscode'
import { readSettings } from '../config'
import { TEXT } from '../const/text'
import type { PreviewItem } from '../editor/preview'
import { orderSelections } from '../editor/selections'
import { generateSequence } from '../range'
import { runInputFlow, type ComputeOutcome } from './inputFlow'

const HISTORY_KEY = 'rangeTransform.lastRange'

/**
 * Spreads a generated sequence across the selections.
 *
 * With several cursors there is one item per cursor. With a single cursor there is
 * nowhere to put the rest, so the whole sequence goes in joined by newlines — which is
 * what makes `1:10` at one cursor useful rather than a way to insert the number 1 and
 * silently discard nine values, as the previous implementation did.
 *
 * Cursors the sequence never reaches get `null` *and* a `skip` preview: nothing happens
 * there, and nothing should be drawn there either. Reusing the transform's error preview
 * for them claimed an expression had thrown in a command that takes no expression.
 */
function distribute(
  sequence: readonly string[],
  selectionCount: number,
  eol: string,
): { replacements: (string | null)[]; previews: PreviewItem[] } {
  if (selectionCount <= 1) {
    const text = sequence.join(eol)
    return { replacements: [text], previews: [{ kind: 'replace', text }] }
  }

  const replacements: (string | null)[] = []
  const previews: PreviewItem[] = []
  for (let index = 0; index < selectionCount; index += 1) {
    const text = sequence[index]
    replacements.push(text ?? null)
    previews.push(
      text === undefined ? { kind: 'skip' } : { kind: 'replace', text },
    )
  }
  return { replacements, previews }
}

export async function insertSequenceCommand(
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
  const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'

  await runInputFlow(editor, ordered, decorationType, memento, {
    title: TEXT.rangeTitle,
    prompt: TEXT.rangePrompt,
    placeholder: TEXT.rangePlaceholder,
    emptyMessage: TEXT.rangeEmpty,
    historyKey: HISTORY_KEY,
    rememberLastInput: settings.rememberLastInput,
    previewMaxLength: settings.previewMaxLength,
    compute(value): ComputeOutcome {
      const sequence = generateSequence(
        value,
        ordered.length,
        settings.defaultSequenceLength,
      )
      if (sequence.length === 0) {
        return { ok: false, message: TEXT.rangeInvalid }
      }
      const { replacements, previews } = distribute(
        sequence,
        ordered.length,
        eol,
      )
      return {
        ok: true,
        computation: { replacements, previews, failures: 0 },
      }
    },
  })
}
