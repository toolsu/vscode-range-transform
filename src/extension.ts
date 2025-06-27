import * as vscode from 'vscode'
import { STYLES } from '@/const/visual'
import { rangeGenerate } from './extension/range'
import { transformText } from './extension/transform'
import { advancedTransformText } from './extension/transformAdvanced'
import { cleanupOrphanedTempFiles } from './extension/cleanupOrphanedTempFiles'

// Decoration type for preview
let previewDecorationType: vscode.TextEditorDecorationType

export function activate(context: vscode.ExtensionContext) {
  // Create decoration type that styles both selection and preview
  previewDecorationType = vscode.window.createTextEditorDecorationType({
    ...STYLES.selection,
    after: {
      ...STYLES.preview,
    },
  })

  // Clean up orphaned temp files on extension activation (max once per day)
  cleanupOrphanedTempFiles(context)

  // Register the range transform command
  const rangeDisposable = vscode.commands.registerCommand(
    'range-transform.range',
    () => rangeGenerate(previewDecorationType),
  )

  // Register the transform command
  const transformDisposable = vscode.commands.registerCommand(
    'range-transform.transform',
    () => transformText(previewDecorationType),
  )

  // Register the advanced transform command
  const advancedTransformDisposable = vscode.commands.registerCommand(
    'range-transform.transform-advanced',
    () => advancedTransformText(previewDecorationType, context),
  )

  context.subscriptions.push(
    rangeDisposable,
    transformDisposable,
    advancedTransformDisposable,
    previewDecorationType,
  )
}

export function deactivate() {
  if (previewDecorationType) {
    previewDecorationType.dispose()
  }
}
