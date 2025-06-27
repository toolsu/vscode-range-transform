import * as vscode from 'vscode'
import { transformSelections } from '../transform/main'
import { TEXT } from '@/const/text'
import { showPreview, applyResults } from './range'

export const transformText = async (
  previewDecorationType: vscode.TextEditorDecorationType,
) => {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage(TEXT.noActiveEditor)
    return
  }

  const selections = editor.selections
  if (selections.length === 0) {
    vscode.window.showErrorMessage(TEXT.noSelectionsFound)
    return
  }

  // Show input dialog with real-time preview
  const input = await vscode.window.showInputBox({
    prompt: TEXT.transformPrompt,
    placeHolder: TEXT.transformPlaceholder,
    validateInput: (value) => {
      // Clear previous preview
      editor.setDecorations(previewDecorationType, [])

      if (!value) {
        return TEXT.emptyTransform
      }

      try {
        // Generate transformed results and show preview
        const results = transformSelections(editor, selections, value)

        if (results.some((result) => result === '[Error]')) {
          return TEXT.invalidTransform
        }

        // Show preview
        showPreview(editor, selections, results, previewDecorationType)

        return null // No error, input is valid
      } catch (error) {
        return TEXT.invalidTransform
      }
    },
  })

  // Clear preview decorations
  editor.setDecorations(previewDecorationType, [])

  if (!input) {
    return
  }

  try {
    // Generate final transformed results and apply them
    const results = transformSelections(editor, selections, input)

    if (results.some((result) => result === '[Error]')) {
      vscode.window.showErrorMessage(TEXT.invalidTransform)
      return
    }

    // Apply the results to selections
    await applyResults(editor, selections, results)
  } catch (error) {
    vscode.window.showErrorMessage(TEXT.invalidTransform)
  }
}
