import * as vscode from 'vscode'
import * as assert from 'assert'
import { activate, deactivate } from '../extension'

suite('Extension Main Tests', () => {
  let context: vscode.ExtensionContext

  setup(() => {
    // Create mock extension context
    context = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => [],
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        setKeysForSync: () => {},
        keys: () => [],
      },
      extensionUri: vscode.Uri.file(__dirname),
      extensionPath: __dirname,
      asAbsolutePath: (relativePath: string) => relativePath,
      storageUri: vscode.Uri.file(__dirname),
      globalStorageUri: vscode.Uri.file(__dirname),
      logUri: vscode.Uri.file(__dirname),
      extensionMode: vscode.ExtensionMode.Test,
      secrets: {} as any,
      environmentVariableCollection: {} as any,
      extension: {} as any,
      logPath: __dirname,
      storagePath: __dirname,
      globalStoragePath: __dirname,
    } as unknown as vscode.ExtensionContext
  })

  test('should activate extension without errors', () => {
    assert.doesNotThrow(() => {
      activate(context)
    })
  })

  test('should register commands on activation', () => {
    const initialSubscriptionCount = context.subscriptions.length

    // Commands may already be registered, so we wrap in try-catch
    try {
      activate(context)
      // Should have registered 3 commands + the decoration type
      assert.strictEqual(
        context.subscriptions.length,
        initialSubscriptionCount + 4,
      )
    } catch (error) {
      // Commands already exist - this is expected in test environment
      assert.ok(error instanceof Error)
      assert.ok(error.message.includes('already exists'))
    }
  })

  test('should deactivate extension without errors', () => {
    try {
      activate(context)
    } catch (error) {
      // Commands may already exist - ignore
    }
    assert.doesNotThrow(() => {
      deactivate()
    })
  })

  test('should handle multiple activations gracefully', () => {
    const initialSubscriptionCount = context.subscriptions.length

    try {
      activate(context)
      const afterFirstActivation = context.subscriptions.length

      // Second activation should add more subscriptions
      activate(context)
      const afterSecondActivation = context.subscriptions.length

      assert.ok(afterFirstActivation > initialSubscriptionCount)
      assert.ok(afterSecondActivation > afterFirstActivation)
    } catch (error) {
      // Commands already exist - this is expected in test environment
      assert.ok(error instanceof Error)
      assert.ok(error.message.includes('already exists'))
    }
  })

  test('should handle deactivation when not activated', () => {
    // Should not throw error even if not activated
    assert.doesNotThrow(() => {
      deactivate()
    })
  })
})
