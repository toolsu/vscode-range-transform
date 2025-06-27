import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { transformSelections } from '../transform/main'
import { generateTemplate } from '../transform/template'
import { removeComment } from '../transform/removeComment'
import { TEXT } from '@/const/text'
import { ADVANCED_TRANSFORM_PLACEHOLDER, TEMP_FILE } from '@/const/const'
import { sprintf } from '@/utils/sprintf'
import { showPreview, applyResults } from './range'
import { cleanupOrphanedTempFiles } from './cleanupOrphanedTempFiles'

// Store reference to current advanced transform context
let currentAdvancedTransformContext: {
  originalEditor: vscode.TextEditor
  originalSelections: readonly vscode.Selection[]
  templateDocument: vscode.TextDocument
  tempFilePath?: string
  changeListener?: vscode.Disposable
  editorChangeListener?: vscode.Disposable
  saveListener?: vscode.Disposable
} | null = null

const cleanupAdvancedTransform = (
  previewDecorationType: vscode.TextEditorDecorationType,
) => {
  if (!currentAdvancedTransformContext) {
    return
  }

  const {
    originalEditor,
    changeListener,
    editorChangeListener,
    saveListener,
    tempFilePath,
  } = currentAdvancedTransformContext

  // Clear the preview decorations
  try {
    originalEditor.setDecorations(previewDecorationType, [])
  } catch (error) {
    // Ignore decoration cleanup errors
  }

  // Dispose all listeners
  if (changeListener) {
    changeListener.dispose()
  }
  if (editorChangeListener) {
    editorChangeListener.dispose()
  }
  if (saveListener) {
    saveListener.dispose()
  }

  // Delete temp file
  if (tempFilePath) {
    try {
      fs.unlinkSync(tempFilePath)
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Clear the context
  currentAdvancedTransformContext = null
}

const updateAdvancedPreview = (
  previewDecorationType: vscode.TextEditorDecorationType,
) => {
  if (!currentAdvancedTransformContext) {
    return
  }

  const { originalEditor, originalSelections, templateDocument } =
    currentAdvancedTransformContext

  try {
    // Get current content and extract expression
    const currentContent = templateDocument.getText()
    const expression = removeComment(currentContent)

    // Generate preview results
    const results = transformSelections(
      originalEditor,
      originalSelections,
      expression,
    )

    if (results.some((result) => result === '[Error]')) {
      // Clear preview on error
      originalEditor.setDecorations(previewDecorationType, [])
      return
    }

    // Show preview
    showPreview(
      originalEditor,
      originalSelections,
      results,
      previewDecorationType,
    )
  } catch (error) {
    // Clear preview on any error
    originalEditor.setDecorations(previewDecorationType, [])
  }
}

export const applyAdvancedTransform = async (
  previewDecorationType: vscode.TextEditorDecorationType,
) => {
  if (!currentAdvancedTransformContext) {
    // This should not happen since it's only called internally when context exists
    return
  }

  const { originalEditor, originalSelections, templateDocument } =
    currentAdvancedTransformContext

  try {
    // Get the current content of the template document
    const currentContent = templateDocument.getText()

    // Extract the expression from the template
    const expression = removeComment(currentContent)

    // Apply the transformation
    const results = transformSelections(
      originalEditor,
      originalSelections,
      expression,
    )

    if (results.some((result) => result === '[Error]')) {
      vscode.window.showErrorMessage(TEXT.invalidTransform)
      return
    }

    // Apply the results to selections
    await applyResults(originalEditor, originalSelections, results)

    // Clear the preview decorations
    originalEditor.setDecorations(previewDecorationType, [])

    // Close the template editor
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor')

    // Use the centralized cleanup function
    cleanupAdvancedTransform(previewDecorationType)

    // Show success message
    vscode.window.showInformationMessage(
      sprintf(TEXT.advancedTransformApplied, originalSelections.length),
    )
  } catch (error) {
    vscode.window.showErrorMessage(
      sprintf(
        TEXT.errorProcessingExpression,
        error instanceof Error ? error.message : 'Unknown error',
      ),
    )
  }
}

export const advancedTransformText = async (
  previewDecorationType: vscode.TextEditorDecorationType,
  context?: vscode.ExtensionContext,
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

  // Clean up orphaned temp files before creating new ones (max once per day)
  await cleanupOrphanedTempFiles(context)

  // Get the first selection text for the template
  const firstSelectionText = editor.document.getText(selections[0])

  // Generate template with all variables and functions documented
  const templateContent = generateTemplate(
    selections.length,
    firstSelectionText,
  )

  try {
    // Create a temporary file
    const tempDir = os.tmpdir()
    const tempFileName = `${TEMP_FILE.FILE_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}${TEMP_FILE.FILE_SUFFIX}`
    const tempFilePath = path.join(tempDir, tempFileName)

    // Write template content to temporary file
    fs.writeFileSync(tempFilePath, templateContent, 'utf8')

    // Open the temporary file
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(tempFilePath),
    )
    const templateEditor = await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: false,
    })

    // Move to the last line and select ADVANCED_TRANSFORM_PLACEHOLDER
    const lastLineIndex = document.lineCount - 1
    const lastLine = document.lineAt(lastLineIndex)
    const placeholderIndex = lastLine.text.indexOf(
      ADVANCED_TRANSFORM_PLACEHOLDER,
    )

    if (placeholderIndex !== -1) {
      // Found the placeholder, select it
      const startPos = new vscode.Position(lastLineIndex, placeholderIndex)
      const endPos = new vscode.Position(
        lastLineIndex,
        placeholderIndex + ADVANCED_TRANSFORM_PLACEHOLDER.length,
      )
      const selection = new vscode.Selection(startPos, endPos)

      templateEditor.selection = selection
      templateEditor.revealRange(
        selection,
        vscode.TextEditorRevealType.InCenter,
      )
    } else {
      // Fallback: just move to the end of the last line
      const endPos = new vscode.Position(lastLineIndex, lastLine.text.length)
      templateEditor.selection = new vscode.Selection(endPos, endPos)
      templateEditor.revealRange(
        new vscode.Range(endPos, endPos),
        vscode.TextEditorRevealType.InCenter,
      )
    }

    // Store the context for later use
    currentAdvancedTransformContext = {
      originalEditor: editor,
      originalSelections: selections,
      templateDocument: document,
      tempFilePath: tempFilePath,
    }

    // Add document change listener for live preview
    const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === document) {
        // Debounce updates to avoid too many preview updates
        setTimeout(() => updateAdvancedPreview(previewDecorationType), 300)
      }
    })

    // Listen for when the specific temp document is saved
    const saveListener = vscode.workspace.onDidSaveTextDocument((savedDoc) => {
      if (savedDoc === document && currentAdvancedTransformContext) {
        // Temp file was saved, apply the transform
        applyAdvancedTransform(previewDecorationType)
      }
    })

    // Check if document still exists when editors change (for temp file cleanup)
    const editorChangeListener = vscode.window.onDidChangeVisibleTextEditors(
      () => {
        if (currentAdvancedTransformContext) {
          // Small delay to let VS Code settle, then check if document still exists
          setTimeout(() => {
            if (currentAdvancedTransformContext) {
              // Check if document is open in any tab (visible or background)
              let docOpenInAnyTab = false
              for (const tabGroup of vscode.window.tabGroups.all) {
                for (const tab of tabGroup.tabs) {
                  if (
                    tab.input &&
                    typeof tab.input === 'object' &&
                    'uri' in tab.input &&
                    (tab.input as any).uri?.toString() ===
                      document.uri.toString()
                  ) {
                    docOpenInAnyTab = true
                    break
                  }
                }
                if (docOpenInAnyTab) {
                  break
                }
              }

              if (!docOpenInAnyTab) {
                // Document no longer exists, clean up
                cleanupAdvancedTransform(previewDecorationType)
              }
            }
          }, 100)
        }
      },
    )

    // Store all listeners in context for cleanup
    currentAdvancedTransformContext.changeListener = changeListener
    currentAdvancedTransformContext.editorChangeListener = editorChangeListener
    currentAdvancedTransformContext.saveListener = saveListener

    // Show initial preview
    setTimeout(() => updateAdvancedPreview(previewDecorationType), 100)

    // the editor is now open
  } catch (error) {
    vscode.window.showErrorMessage(
      sprintf(
        TEXT.errorCreatingAdvancedEditor,
        error instanceof Error ? error.message : TEXT.unknownError,
      ),
    )
  }
}
