import * as assert from 'node:assert/strict'
import * as vscode from 'vscode'
import { SCRATCH } from '../const/const'
import {
  applyScratchCommand,
  cancelScratchCommand,
  transformAdvancedCommand,
} from '../commands/transformAdvanced'
import { createPreviewDecorationType } from '../editor/preview'

const EXTENSION_ID = 'tomchen.range-transform'

/**
 * A context whose only used member is `globalStorageUri`.
 *
 * The real one is not reachable from a test, and the scratch flow needs nothing else.
 */
function fakeContext(): vscode.ExtensionContext {
  const extension = vscode.extensions.getExtension(EXTENSION_ID)
  assert.ok(extension)
  return {
    globalStorageUri: vscode.Uri.joinPath(
      vscode.Uri.file(extension.extensionPath),
      '..',
      '.rt-e2e-advanced',
    ),
  } as vscode.ExtensionContext
}

/** Opens a document and selects each line whole. */
async function openWithLinesSelected(
  lines: string[],
): Promise<vscode.TextEditor> {
  const document = await vscode.workspace.openTextDocument({
    content: lines.join('\n'),
    language: 'plaintext',
  })
  const editor = await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  })
  editor.selections = lines.map(
    (line, index) => new vscode.Selection(index, 0, index, line.length),
  )
  return editor
}

function scratchTabs(): vscode.Tab[] {
  return vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter(
      (tab) =>
        tab.input instanceof vscode.TabInputText &&
        tab.input.uri.path.includes(SCRATCH.filePrefix),
    )
}

/** Finds the scratch editor the command just opened. */
function scratchEditor(): vscode.TextEditor {
  const found = vscode.window.visibleTextEditors.find((editor) =>
    editor.document.fileName.includes(SCRATCH.filePrefix),
  )
  assert.ok(found, 'the advanced command should have opened a scratch editor')
  return found
}

/** Replaces the scratch file's expression, keeping the header comments. */
async function writeExpression(
  editor: vscode.TextEditor,
  expression: string,
): Promise<void> {
  const document = editor.document
  const lastLine = document.lineCount - 1
  const fullRange = new vscode.Range(
    new vscode.Position(0, 0),
    document.lineAt(lastLine).range.end,
  )
  const header = document
    .getText()
    .split('\n')
    .filter((line) => line.startsWith('//'))
    .join('\n')
  await editor.edit((builder) => {
    builder.replace(fullRange, `${header}\n\n${expression}\n`)
  })
}

/** Waits for the session's asynchronous teardown to settle. */
function settle(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Waits until `condition` holds, or `timeoutMs` passes. For outcomes that arrive
 * asynchronously, such as the edit applied when a tab closes, where a fixed `settle`
 * is too short on a slow runner: the macOS runners started missing a 500 ms window.
 */
async function waitFor(
  condition: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition() && Date.now() < deadline) {
    await settle(50)
  }
}

suite('advanced transform', () => {
  let decorationType: vscode.TextEditorDecorationType

  setup(() => {
    decorationType = createPreviewDecorationType()
  })

  teardown(async () => {
    decorationType.dispose()
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })

  test('opens a scratch editor beside the original selections', async () => {
    const editor = await openWithLinesSelected(['1', '2', '3'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    const scratch = scratchEditor()
    assert.equal(scratch.document.languageId, 'typescript')
    assert.notEqual(scratch.viewColumn, editor.viewColumn)

    const text = scratch.document.getText()
    assert.ok(text.startsWith('/// <reference path="'))
    assert.ok(text.includes('3 selections'))
    // The placeholder is pre-selected, so typing replaces it.
    assert.equal(
      scratch.document.getText(scratch.selection),
      SCRATCH.placeholder,
    )

    await cancelScratchCommand()
    await settle()
  })

  test('applying rewrites the original selections and closes the tab', async () => {
    const editor = await openWithLinesSelected(['1', '2', '3'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    await writeExpression(scratchEditor(), 'n * 10')
    await applyScratchCommand()
    await settle()

    assert.equal(editor.document.getText(), '10\n20\n30')
    assert.equal(scratchTabs().length, 0, 'the scratch tab should be closed')
  })

  test('evaluates a multi-line expression and returns the last value', async () => {
    const editor = await openWithLinesSelected(['ab-cd', 'ef-gh'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    await writeExpression(
      scratchEditor(),
      ['const parts = s.split("-")', 'parts.map(upper).join(" ")'].join('\n'),
    )
    await applyScratchCommand()
    await settle()

    assert.equal(editor.document.getText(), 'AB CD\nEF GH')
  })

  test('leaves the header comments harmless', async () => {
    // The whole file is evaluated as JavaScript, comments included — there is no
    // comment-stripping step that could mangle the user's own strings.
    const editor = await openWithLinesSelected(['x'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    await writeExpression(scratchEditor(), 's.replace("//", "") + "//ok"')
    await applyScratchCommand()
    await settle()

    assert.equal(editor.document.getText(), 'x//ok')
  })

  test('cancelling leaves the document untouched', async () => {
    const editor = await openWithLinesSelected(['1', '2'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    await writeExpression(scratchEditor(), 'n * 999')
    await cancelScratchCommand()
    await settle()

    assert.equal(editor.document.getText(), '1\n2')
    assert.equal(scratchTabs().length, 0)
  })

  test('an emptied file applies nothing', async () => {
    const editor = await openWithLinesSelected(['1', '2'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    const scratch = scratchEditor()
    await scratch.edit((builder) => {
      builder.delete(
        new vscode.Range(
          new vscode.Position(0, 0),
          scratch.document.lineAt(scratch.document.lineCount - 1).range.end,
        ),
      )
    })
    await applyScratchCommand()
    await settle()

    assert.equal(editor.document.getText(), '1\n2')
    assert.equal(scratchTabs().length, 0)
  })

  test('a syntax error keeps the editor open and changes nothing', async () => {
    const editor = await openWithLinesSelected(['1'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    await writeExpression(scratchEditor(), 'n * (')
    await applyScratchCommand()
    await settle()

    assert.equal(editor.document.getText(), '1')
    assert.equal(
      scratchTabs().length,
      1,
      'work must not be discarded because of a typo',
    )

    // Fixing it and applying again should work.
    await writeExpression(scratchEditor(), 'n * 7')
    await applyScratchCommand()
    await settle()

    assert.equal(editor.document.getText(), '7')
    assert.equal(scratchTabs().length, 0)
  })

  test('starting a second advanced transform replaces the first', async () => {
    await openWithLinesSelected(['1'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    const first = scratchEditor().document.uri.toString()

    await openWithLinesSelected(['2'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    const second = scratchEditor().document.uri.toString()

    assert.notEqual(first, second)
    assert.equal(scratchTabs().length, 1, 'only one scratch tab at a time')

    await cancelScratchCommand()
    await settle()
  })

  test('closing the tab applies, the way a commit message does', async () => {
    const editor = await openWithLinesSelected(['1', '2', '3'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    await writeExpression(scratchEditor(), 'letter')

    // Exactly what a user clicking the tab's × produces.
    //
    // Deliberately not asserting on `tabGroups.close`'s result: under vscode-test,
    // `FileDialogService.showSaveConfirm` short-circuits to DON'T_SAVE ("refused to show
    // save confirmation dialog in tests"), so it resolves `true` whether the buffer was
    // clean or not. What that leaves this test proving is the more valuable half — that
    // the close-time revert does not replace the expression with the template.
    await vscode.window.tabGroups.close(scratchTabs())
    await waitFor(
      () =>
        editor.document.getText() === 'A\nB\nC' && scratchTabs().length === 0,
    )

    assert.equal(editor.document.getText(), 'A\nB\nC')
    assert.equal(scratchTabs().length, 0)
  })

  test('closing an emptied tab cancels', async () => {
    const editor = await openWithLinesSelected(['1', '2'])
    await transformAdvancedCommand(fakeContext(), decorationType)

    const scratch = scratchEditor()
    await scratch.edit((builder) => {
      builder.delete(
        new vscode.Range(
          new vscode.Position(0, 0),
          scratch.document.lineAt(scratch.document.lineCount - 1).range.end,
        ),
      )
    })
    await vscode.window.tabGroups.close(scratchTabs())
    await settle(500)

    assert.equal(editor.document.getText(), '1\n2')
  })

  test('survives the source document being hidden and shown again', async () => {
    // VS Code disposes an ext-host TextEditor as soon as its group shows something else,
    // and `edit()` on the dead object rejects. A session that pinned the editor when it
    // opened would lose everything the user typed the first time they glanced at another
    // tab.
    const editor = await openWithLinesSelected(['1', '2', '3'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    await writeExpression(scratchEditor(), 'n * 5')

    const other = await vscode.workspace.openTextDocument({
      content: 'elsewhere',
      language: 'plaintext',
    })
    await vscode.window.showTextDocument(other, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    })

    await applyScratchCommand()
    await settle(500)

    assert.equal(editor.document.getText(), '5\n10\n15')
    assert.equal(scratchTabs().length, 0)
  })

  test('closing with a syntax error puts the scratch editor back', async () => {
    const editor = await openWithLinesSelected(['1'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    await writeExpression(scratchEditor(), 'n * (')

    await vscode.window.tabGroups.close(scratchTabs())
    await settle(700)

    assert.equal(editor.document.getText(), '1')
    assert.equal(
      scratchTabs().length,
      1,
      'closing must not discard the expression over a typo',
    )
    assert.ok(
      scratchEditor().document.getText().includes('n * ('),
      'the expression the user wrote must still be there',
    )

    // And it must still be usable once corrected.
    await writeExpression(scratchEditor(), 'n * 4')
    await applyScratchCommand()
    await settle()
    assert.equal(editor.document.getText(), '4')
  })

  test('refuses to apply after the source document has been edited', async () => {
    // The captured selections are fixed ranges; the preview decorations move with an
    // edit but they do not, so applying would rewrite whatever now sits at the old
    // offsets.
    const editor = await openWithLinesSelected(['1', '2', '3'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    await writeExpression(scratchEditor(), 'n * 10')

    await editor.edit((builder) => {
      builder.insert(new vscode.Position(0, 0), 'inserted\n')
    })
    await settle()

    await applyScratchCommand()
    await settle(500)

    assert.equal(editor.document.getText(), 'inserted\n1\n2\n3')
    assert.equal(
      scratchTabs().length,
      1,
      'the expression is kept, not discarded',
    )

    await cancelScratchCommand()
    await settle()
  })

  test('keeps the scratch buffer saved, so closing it never asks', async () => {
    // The half the test above cannot check: the buffer is genuinely clean shortly after
    // the last keystroke, which is what stops a real user meeting a save prompt for a
    // file they never knowingly created.
    const editor = await openWithLinesSelected(['1'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    const scratch = scratchEditor()

    await writeExpression(scratch, 'n * 2')
    assert.equal(scratch.document.isDirty, true, 'an edit makes it dirty')

    await settle(500)
    assert.equal(
      scratch.document.isDirty,
      false,
      'the debounced save must have written it out',
    )

    await applyScratchCommand()
    await settle()
    assert.equal(editor.document.getText(), '2')
  })

  test('closing after the source document was closed applies nothing', async () => {
    // Reopening a file produces a different TextDocument object, so the captured one
    // could never be matched again — and the file's content may have changed on disk
    // while it was shut.
    const editor = await openWithLinesSelected(['1', '2'])
    await transformAdvancedCommand(fakeContext(), decorationType)
    await writeExpression(scratchEditor(), 'n * 100')

    const sourceTabs = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter(
        (tab) =>
          tab.input instanceof vscode.TabInputText &&
          tab.input.uri.toString() === editor.document.uri.toString(),
      )
    await vscode.window.tabGroups.close(sourceTabs)
    await settle(300)

    // The scratch tab must dismiss cleanly rather than resurrect itself.
    await vscode.window.tabGroups.close(scratchTabs())
    await settle(600)
    assert.equal(scratchTabs().length, 0, 'a dead session must be dismissable')
  })

  test('the internal commands do nothing when no session is open', async () => {
    await applyScratchCommand()
    await cancelScratchCommand()
  })
})
