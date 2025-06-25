import * as vscode from 'vscode'
import { main } from './utils/range/main'
import { STYLES } from '@/const/const'
import { TEXT } from '@/const/text'

// Decoration type for preview
let previewDecorationType: vscode.TextEditorDecorationType

/**
 * Show preview decorations for the generated previews
 */
function showPreview(
  editor: vscode.TextEditor,
  selections: readonly vscode.Selection[],
  previews: string[],
  useSelectionOrder: boolean = false,
) {
  const decorations: vscode.DecorationOptions[] = []

  // Create array with selections and their original indices
  const selectionsWithIndex = Array.from(selections).map(
    (selection, originalIndex) => ({
      selection,
      originalIndex,
    }),
  )

  // Sort by document order unless useSelectionOrder is true
  if (!useSelectionOrder) {
    selectionsWithIndex.sort((a, b) => {
      const lineCompare = a.selection.start.line - b.selection.start.line
      if (lineCompare !== 0) {
        return lineCompare
      }
      return a.selection.start.character - b.selection.start.character
    })
  }

  selectionsWithIndex.forEach(({ selection }, index) => {
    // Get the corresponding preview item for this selection
    const preview = index < previews.length ? previews[index] : ''

    if (!preview) {
      return
    }

    if (selection.isEmpty) {
      // Single cursor - show preview after cursor
      decorations.push({
        range: selection,
        renderOptions: {
          after: {
            contentText: ` → ${preview}`,
          },
        },
      })
    } else {
      // Selection - highlight selection and show preview at the end
      decorations.push({
        range: selection,
        renderOptions: {
          after: {
            contentText: ` → ${preview}`,
          },
        },
      })
    }
  })

  editor.setDecorations(previewDecorationType, decorations)
}

/**
 * Apply the generated sequence to the selections
 */
async function applyResults(
  editor: vscode.TextEditor,
  selections: readonly vscode.Selection[],
  results: string[],
  useSelectionOrder: boolean = false,
) {
  // Create array with selections and their original indices
  const selectionsWithIndex = Array.from(selections).map(
    (selection, originalIndex) => ({
      selection,
      originalIndex,
    }),
  )

  // Sort by document order unless useSelectionOrder is true
  if (!useSelectionOrder) {
    selectionsWithIndex.sort((a, b) => {
      const lineCompare = a.selection.start.line - b.selection.start.line
      if (lineCompare !== 0) {
        return lineCompare
      }
      return a.selection.start.character - b.selection.start.character
    })
  }

  await editor.edit((editBuilder) => {
    selectionsWithIndex.forEach(({ selection }, index) => {
      // Get the corresponding result item for this selection
      const result = index < results.length ? results[index] : ''

      if (!result) {
        return
      }

      if (selection.isEmpty) {
        // Single cursor - insert result item
        editBuilder.insert(selection.start, result)
      } else {
        // Selection - replace with result item
        editBuilder.replace(selection, result)
      }
    })
  })
}

const rangeTransform = async () => {
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
    prompt: TEXT.rangePrompt,
    placeHolder: TEXT.rangePlaceholder,
    validateInput: (value) => {
      // Clear previous preview
      editor.setDecorations(previewDecorationType, [])

      if (!value) {
        return TEXT.emptyRange
      }

      // Generate sequence and show preview
      const sequence = main(value, selections.length)

      if (sequence.length === 0) {
        return TEXT.invalidRange
      }

      // Show preview
      showPreview(editor, selections, sequence)

      return null // No error, input is valid
    },
  })

  // Clear preview decorations
  editor.setDecorations(previewDecorationType, [])

  if (!input) {
    return
  }

  // Generate final sequence and apply it
  const sequence = main(input, selections.length)

  if (sequence.length === 0) {
    vscode.window.showErrorMessage(TEXT.invalidRange)
    return
  }

  // Apply the sequence to selections
  await applyResults(editor, selections, sequence)
}

export function activate(context: vscode.ExtensionContext) {
  // Create decoration type that styles both selection and preview
  previewDecorationType = vscode.window.createTextEditorDecorationType({
    ...STYLES.selection,
    after: {
      ...STYLES.preview,
    },
  })

  // Register the range transform command
  const disposable = vscode.commands.registerCommand(
    'range-transform.range',
    rangeTransform,
  )

  context.subscriptions.push(disposable, previewDecorationType)
}

export function deactivate() {
  if (previewDecorationType) {
    previewDecorationType.dispose()
  }
}
