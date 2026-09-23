import * as vscode from 'vscode'
import { insertSequenceCommand } from './commands/insertSequence'
import { transformCommand } from './commands/transform'
import {
  applyScratchCommand,
  cancelScratchCommand,
  disposeAdvancedSession,
  transformAdvancedCommand,
} from './commands/transformAdvanced'
import { createPreviewDecorationType } from './editor/preview'
import { sweepScratchDirectory } from './scratchStore'

let previewDecorationType: vscode.TextEditorDecorationType | undefined

export function activate(context: vscode.ExtensionContext): void {
  previewDecorationType = createPreviewDecorationType()
  const decorationType = previewDecorationType

  // Remove scratch files left behind by a crash. Deliberately not awaited: it is a
  // directory listing over a handful of small files and must not delay activation.
  void sweepScratchDirectory(context)

  context.subscriptions.push(
    decorationType,
    vscode.commands.registerCommand('range-transform.insertSequence', () =>
      insertSequenceCommand(decorationType, context.workspaceState),
    ),
    vscode.commands.registerCommand('range-transform.transform', () =>
      transformCommand(decorationType, context.workspaceState),
    ),
    vscode.commands.registerCommand('range-transform.transformAdvanced', () =>
      transformAdvancedCommand(context, decorationType),
    ),
    vscode.commands.registerCommand(
      'range-transform.internal.applyScratch',
      () => applyScratchCommand(),
    ),
    vscode.commands.registerCommand(
      'range-transform.internal.cancelScratch',
      () => cancelScratchCommand(),
    ),
  )
}

export function deactivate(): void {
  disposeAdvancedSession()
  previewDecorationType?.dispose()
  previewDecorationType = undefined
}
