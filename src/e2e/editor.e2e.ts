import * as assert from 'node:assert/strict'
import * as vscode from 'vscode'
import { applyReplacements } from '../editor/apply'
import {
  clearPreview,
  createPreviewDecorationType,
  renderPreview,
} from '../editor/preview'
import { orderSelections, snapshotSelections } from '../editor/selections'
import { runTransform } from '../transform'

async function openDocument(content: string): Promise<vscode.TextEditor> {
  const document = await vscode.workspace.openTextDocument({
    content,
    language: 'plaintext',
  })
  return vscode.window.showTextDocument(document, { preview: false })
}

async function closeAll(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors')
}

function selection(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
): vscode.Selection {
  return new vscode.Selection(startLine, startCharacter, endLine, endCharacter)
}

suite('editor integration', () => {
  teardown(async () => {
    await closeAll()
  })

  test('orders selections by document position, not creation order', async () => {
    const editor = await openDocument('one\ntwo\nthree')
    editor.selections = [
      selection(2, 0, 2, 5),
      selection(0, 0, 0, 3),
      selection(1, 0, 1, 3),
    ]

    const ordered = orderSelections(editor.selections)
    const snapshot = snapshotSelections(editor.document, ordered)

    assert.deepEqual(snapshot.texts, ['one', 'two', 'three'])
    assert.deepEqual(snapshot.startLines, [0, 1, 2])
    assert.deepEqual(snapshot.wholeLines, ['one', 'two', 'three'])
  })

  test('replaces several selections on one line at the right offsets', async () => {
    const editor = await openDocument('1, 2, 3')
    const ordered = orderSelections([
      selection(0, 0, 0, 1),
      selection(0, 3, 0, 4),
      selection(0, 6, 0, 7),
    ])
    editor.selections = ordered

    const changed = await applyReplacements(editor, ordered, [
      'one',
      'two',
      'three',
    ])

    assert.equal(changed, 3)
    assert.equal(editor.document.getText(), 'one, two, three')
    // The selections left behind must cover the results, which is exactly what the old
    // position arithmetic got wrong for the second and third items.
    assert.deepEqual(
      editor.selections.map((each) => editor.document.getText(each)),
      ['one', 'two', 'three'],
    )
  })

  test('leaves a null replacement untouched', async () => {
    const editor = await openDocument('aa bb cc')
    const ordered = orderSelections([
      selection(0, 0, 0, 2),
      selection(0, 3, 0, 5),
      selection(0, 6, 0, 8),
    ])
    editor.selections = ordered

    const changed = await applyReplacements(editor, ordered, ['XX', null, 'ZZ'])

    assert.equal(changed, 2)
    assert.equal(editor.document.getText(), 'XX bb ZZ')
  })

  test('applies a whole transform end to end', async () => {
    const editor = await openDocument('1\n2\n3\n4')
    const ordered = orderSelections([
      selection(0, 0, 0, 1),
      selection(1, 0, 1, 1),
      selection(2, 0, 2, 1),
      selection(3, 0, 3, 1),
    ])
    editor.selections = ordered

    const snapshot = snapshotSelections(editor.document, ordered)
    const result = runTransform(snapshot, '*3')
    assert.equal(result.ok, true)
    if (!result.ok) {
      return
    }

    await applyReplacements(
      editor,
      ordered,
      result.items.map((item) => (item.ok ? item.text : null)),
    )

    assert.equal(editor.document.getText(), '3\n6\n9\n12')
  })

  test('rewrites into one undo step', async () => {
    const editor = await openDocument('a\nb')
    const ordered = orderSelections([
      selection(0, 0, 0, 1),
      selection(1, 0, 1, 1),
    ])
    editor.selections = ordered

    await applyReplacements(editor, ordered, ['X', 'Y'])
    assert.equal(editor.document.getText(), 'X\nY')

    await vscode.commands.executeCommand('undo')
    assert.equal(editor.document.getText(), 'a\nb')
  })

  test('renders and clears preview decorations without throwing', async () => {
    const editor = await openDocument('alpha\nbeta')
    const ordered = orderSelections([
      selection(0, 0, 0, 5),
      selection(1, 0, 1, 4),
    ])
    editor.selections = ordered

    const decorationType = createPreviewDecorationType()
    try {
      // Includes a multi-line result, a failure, a skip and an unchanged value — every
      // case the renderer treats specially.
      renderPreview(
        editor,
        decorationType,
        ordered,
        [
          { kind: 'replace', text: 'one\ntwo' },
          { kind: 'error' },
          { kind: 'skip' },
        ],
        120,
      )
      renderPreview(
        editor,
        decorationType,
        ordered,
        [
          { kind: 'replace', text: 'alpha' },
          { kind: 'replace', text: 'BETA' },
        ],
        120,
      )
      clearPreview(editor, decorationType)
    } finally {
      decorationType.dispose()
    }
  })
})
