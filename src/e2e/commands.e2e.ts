import * as assert from 'node:assert/strict'
import * as vscode from 'vscode'

const EXTENSION_ID = 'tomchen.range-transform'

const PUBLIC_COMMANDS = [
  'range-transform.insertSequence',
  'range-transform.transform',
  'range-transform.transformAdvanced',
]

const INTERNAL_COMMANDS = [
  'range-transform.internal.applyScratch',
  'range-transform.internal.cancelScratch',
]

suite('extension activation', () => {
  test('the extension is present and activates', async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID)
    assert.ok(extension, `${EXTENSION_ID} should be installed in the test host`)
    await extension.activate()
    assert.equal(extension.isActive, true)
  })

  test('every contributed command is registered', async () => {
    const registered = await vscode.commands.getCommands(true)
    for (const command of [...PUBLIC_COMMANDS, ...INTERNAL_COMMANDS]) {
      assert.ok(
        registered.includes(command),
        `${command} should be registered after activation`,
      )
    }
  })

  test('the manifest and the registrations agree', () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID)
    assert.ok(extension)

    const contributed = (
      extension.packageJSON.contributes.commands as {
        command: string
        title: string
        category?: string
      }[]
    ).map((entry) => entry.command)

    assert.deepEqual(
      [...contributed].sort(),
      [...PUBLIC_COMMANDS, ...INTERNAL_COMMANDS].sort(),
    )
  })

  test('public commands carry the shared category and no baked-in prefix', () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID)
    assert.ok(extension)

    const commands = extension.packageJSON.contributes.commands as {
      command: string
      title: string
      category?: string
    }[]

    for (const entry of commands) {
      assert.equal(
        entry.category,
        'Range & Transform',
        `${entry.command} should use the shared category`,
      )
      // The palette matches against the composed "Category: Title" string, so a
      // hand-written prefix would both duplicate the category and break queries such
      // as "transform".
      assert.ok(
        !entry.title.includes(':'),
        `${entry.command} should not bake a prefix into its title`,
      )
    }
  })

  test('internal commands are hidden from the command palette', () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID)
    assert.ok(extension)

    const hidden = (
      extension.packageJSON.contributes.menus.commandPalette as {
        command: string
        when: string
      }[]
    ).filter((entry) => entry.when === 'false')

    assert.deepEqual(
      hidden.map((entry) => entry.command).sort(),
      [...INTERNAL_COMMANDS].sort(),
    )
  })
})
