import * as assert from 'node:assert/strict'
import * as vscode from 'vscode'
import { SCRATCH, SCRATCH_CONTEXT_KEY } from '../const/const'
import {
  prepareScratchDirectory,
  sweepScratchDirectory,
  writeScratchFile,
} from '../scratchStore'
import { buildScratchContent, referencePath } from '../transform/scratch'

const EXTENSION_ID = 'tomchen.range-transform'

async function context(): Promise<vscode.ExtensionContext> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID)
  assert.ok(extension)
  await extension.activate()
  // `exports` is undefined for this extension, so reach the context the way the test
  // host exposes it: through the extension's own storage uri.
  return {
    globalStorageUri: vscode.Uri.joinPath(
      vscode.Uri.file(extension.extensionPath),
      '..',
      '.rt-e2e-storage',
    ),
  } as vscode.ExtensionContext
}

const decoder = new TextDecoder()

suite('advanced scratch files', () => {
  test('writes both declaration files next to the scratch file', async () => {
    const { directory, globals } = await prepareScratchDirectory(
      await context(),
    )

    const globalsText = decoder.decode(
      await vscode.workspace.fs.readFile(globals),
    )
    assert.ok(globalsText.includes('declare const s: string'))
    assert.ok(
      globalsText.includes("declare const convnum: typeof import('./convnum')"),
    )

    const convnumUri = vscode.Uri.joinPath(directory, SCRATCH.convnumFileName)
    const convnumText = decoder.decode(
      await vscode.workspace.fs.readFile(convnumUri),
    )
    assert.ok(convnumText.includes('declare function toRoman'))
    // The reference in rt.d.ts resolves to this file by name, so it must be exactly
    // what SCRATCH.convnumFileName says.
    assert.equal(SCRATCH.convnumFileName, 'convnum.d.ts')
  })

  test('the scratch file opens as TypeScript and references the declarations', async () => {
    const { directory, globals } = await prepareScratchDirectory(
      await context(),
    )
    const contents = buildScratchContent({
      globalsPath: globals.fsPath,
      selectionCount: 3,
      documentName: 'example.txt',
    })

    const uri = await writeScratchFile(directory, contents)
    try {
      const document = await vscode.workspace.openTextDocument(uri)
      assert.equal(document.languageId, 'typescript')
      assert.ok(document.fileName.includes(SCRATCH.filePrefix))

      const text = document.getText()
      assert.ok(text.startsWith('/// <reference path="'))
      // TypeScript resolves a raw filesystem path only; a URI or a percent-encoded
      // path silently fails to resolve.
      assert.ok(text.includes(referencePath(globals.fsPath)))
      assert.ok(!text.includes('file://'))
      assert.ok(!text.includes('%20'))
      assert.ok(text.includes('3 selections in example.txt'))
      assert.equal(text.trimEnd().split('\n').pop(), SCRATCH.placeholder)
    } finally {
      await vscode.workspace.fs.delete(uri, { useTrash: false })
      await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    }
  })

  test('sweeping leaves fresh scratch files alone', async () => {
    const ctx = await context()
    const { directory } = await prepareScratchDirectory(ctx)
    const uri = await writeScratchFile(directory, 's\n')
    try {
      await sweepScratchDirectory(ctx)
      const stat = await vscode.workspace.fs.stat(uri)
      assert.ok(stat.size > 0, 'a file written just now must survive the sweep')
    } finally {
      await vscode.workspace.fs.delete(uri, { useTrash: false })
    }
  })

  test('sweeping a directory that does not exist is a no-op', async () => {
    await sweepScratchDirectory({
      globalStorageUri: vscode.Uri.file('/definitely/not/a/real/path/rt'),
    } as vscode.ExtensionContext)
  })

  test('the context key gating the title buttons starts out unset', async () => {
    // `setContext` values cannot be read back, so this asserts the shape the
    // package.json `when` clauses depend on instead.
    assert.equal(SCRATCH_CONTEXT_KEY, 'rangeTransform.scratchOpen')
    assert.ok(SCRATCH.filePrefix.startsWith('rt-transform-'))
  })
})
