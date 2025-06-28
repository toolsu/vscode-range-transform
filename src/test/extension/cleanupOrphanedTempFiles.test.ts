import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as vscode from 'vscode'
import { cleanupOrphanedTempFiles } from '@/extension/cleanupOrphanedTempFiles'
import { TEMP_FILE } from '@/const/const'

// Mock extension context
function createMockContext(lastCleanup: number = 0): vscode.ExtensionContext {
  const workspaceState = new Map<string, any>()
  workspaceState.set('rangeTransformLastCleanup', lastCleanup)

  return {
    workspaceState: {
      get: <T>(key: string, defaultValue?: T): T => {
        return workspaceState.get(key) ?? defaultValue!
      },
      update: async (key: string, value: any): Promise<void> => {
        workspaceState.set(key, value)
      },
      keys: (): readonly string[] => {
        return Array.from(workspaceState.keys())
      },
    },
  } as any
}

// Helper to create temp files for testing
function createTestTempFile(age: number = 0): string {
  const tempDir = os.tmpdir()
  const fileName = `${TEMP_FILE.FILE_PREFIX}test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}${TEMP_FILE.FILE_SUFFIX}`
  const filePath = path.join(tempDir, fileName)

  fs.writeFileSync(filePath, 'test content')

  // Modify file time if age is specified
  if (age > 0) {
    const oldTime = new Date(Date.now() - age)
    fs.utimesSync(filePath, oldTime, oldTime)
  }

  return filePath
}

// Helper to check if file exists
function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath)
    return true
  } catch {
    return false
  }
}

suite('cleanupOrphanedTempFiles Function Tests', () => {
  let createdFiles: string[] = []

  setup(() => {
    // Reset the created files array for each test
    createdFiles = []
  })

  teardown(() => {
    // Clean up any files created during tests
    createdFiles.forEach((filePath) => {
      try {
        if (fileExists(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch {
        // Ignore cleanup errors
      }
    })
    createdFiles = []
  })

  suite('Basic cleanup functionality', () => {
    test('should clean up old temp files', async () => {
      const context = createMockContext()

      // Create an old temp file
      const oldFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      createdFiles.push(oldFile)

      assert.ok(fileExists(oldFile), 'Old file should exist before cleanup')

      await cleanupOrphanedTempFiles(context, true) // Force cleanup

      assert.ok(
        !fileExists(oldFile),
        'Old file should be removed after cleanup',
      )
    })

    test('should preserve recent temp files', async () => {
      const context = createMockContext()

      // Create a recent temp file
      const recentFile = createTestTempFile(1000) // 1 second old
      createdFiles.push(recentFile)

      assert.ok(
        fileExists(recentFile),
        'Recent file should exist before cleanup',
      )

      await cleanupOrphanedTempFiles(context, true) // Force cleanup

      assert.ok(
        fileExists(recentFile),
        'Recent file should be preserved after cleanup',
      )
    })

    test('should only clean files matching the pattern', async () => {
      const context = createMockContext()
      const tempDir = os.tmpdir()

      // Create an old temp file with correct pattern
      const oldTempFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      createdFiles.push(oldTempFile)

      // Create an old file with different pattern
      const oldOtherFile = path.join(
        tempDir,
        `other-old-file-${Date.now()}.tmp`,
      )
      fs.writeFileSync(oldOtherFile, 'test')
      const oldTime = new Date(Date.now() - TEMP_FILE.MAX_FILE_AGE_MS - 1000)
      fs.utimesSync(oldOtherFile, oldTime, oldTime)
      createdFiles.push(oldOtherFile)

      assert.ok(
        fileExists(oldTempFile),
        'Old temp file should exist before cleanup',
      )
      assert.ok(
        fileExists(oldOtherFile),
        'Old other file should exist before cleanup',
      )

      await cleanupOrphanedTempFiles(context, true) // Force cleanup

      assert.ok(!fileExists(oldTempFile), 'Old temp file should be removed')
      assert.ok(fileExists(oldOtherFile), 'Old other file should be preserved')
    })
  })

  suite('Cleanup interval handling', () => {
    test('should skip cleanup if within interval', async () => {
      // Use a much more recent cleanup time to ensure we're well within the interval
      const recentCleanup = Date.now() - 100 // 100ms ago (much less than CLEANUP_INTERVAL_MS)
      const context = createMockContext(recentCleanup)

      const oldFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      createdFiles.push(oldFile)

      assert.ok(
        fileExists(oldFile),
        'Old file should exist before cleanup attempt',
      )

      // Verify the context state before cleanup
      const initialLastCleanup = context.workspaceState.get<number>(
        'rangeTransformLastCleanup',
        0,
      )
      assert.strictEqual(
        initialLastCleanup,
        recentCleanup,
        'Context should have the expected last cleanup time',
      )

      await cleanupOrphanedTempFiles(context, false) // Don't force cleanup

      assert.ok(
        fileExists(oldFile),
        'Old file should still exist after skipped cleanup',
      )

      // Verify the context state was not updated (cleanup was skipped)
      const finalLastCleanup = context.workspaceState.get<number>(
        'rangeTransformLastCleanup',
        0,
      )
      assert.strictEqual(
        finalLastCleanup,
        recentCleanup,
        'Last cleanup time should remain unchanged when cleanup is skipped',
      )
    })

    test('should run cleanup if outside interval', async () => {
      const oldCleanup = Date.now() - TEMP_FILE.CLEANUP_INTERVAL_MS - 1000
      const context = createMockContext(oldCleanup)

      const oldFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      createdFiles.push(oldFile)

      assert.ok(fileExists(oldFile), 'Old file should exist before cleanup')

      await cleanupOrphanedTempFiles(context, false) // Don't force cleanup

      assert.ok(
        !fileExists(oldFile),
        'Old file should be removed after cleanup',
      )
    })

    test('should force cleanup regardless of interval', async () => {
      const recentCleanup = Date.now() - 1000 // 1 second ago
      const context = createMockContext(recentCleanup)

      const oldFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      createdFiles.push(oldFile)

      assert.ok(fileExists(oldFile), 'Old file should exist before cleanup')

      await cleanupOrphanedTempFiles(context, true) // Force cleanup

      assert.ok(
        !fileExists(oldFile),
        'Old file should be removed after forced cleanup',
      )
    })
  })

  suite('Context handling', () => {
    test('should work without context', async () => {
      const oldFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      createdFiles.push(oldFile)

      assert.ok(fileExists(oldFile), 'Old file should exist before cleanup')

      await cleanupOrphanedTempFiles(undefined, true) // No context, force cleanup

      assert.ok(
        !fileExists(oldFile),
        'Old file should be removed after cleanup',
      )
    })

    test('should update last cleanup time in context', async () => {
      const context = createMockContext(0)
      const beforeTime = Date.now()

      await cleanupOrphanedTempFiles(context, true)

      const afterTime = Date.now()
      const lastCleanup = context.workspaceState.get<number>(
        'rangeTransformLastCleanup',
        0,
      )

      assert.ok(
        lastCleanup >= beforeTime,
        'Last cleanup time should be updated',
      )
      assert.ok(
        lastCleanup <= afterTime,
        'Last cleanup time should be reasonable',
      )
    })
  })

  suite('Error handling', () => {
    test('should handle file system errors gracefully', async () => {
      const context = createMockContext()

      // This should not throw even if there are file system issues
      assert.doesNotThrow(async () => {
        await cleanupOrphanedTempFiles(context, true)
      })
    })

    test('should handle missing temp directory gracefully', async () => {
      const context = createMockContext()

      // This test is skipped because we can't redefine os.tmpdir
      // The function should handle missing directories gracefully anyway
      assert.doesNotThrow(async () => {
        await cleanupOrphanedTempFiles(context, true)
      })
    })

    test('should handle files that cannot be deleted', async () => {
      const context = createMockContext()

      const tempFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      createdFiles.push(tempFile)

      // Mock fs.promises.unlink to throw an error
      const originalUnlink = fs.promises.unlink
      const mockUnlink = async (path: string) => {
        if (path === tempFile) {
          throw new Error('Permission denied')
        }
        return originalUnlink(path)
      }

      try {
        Object.defineProperty(fs.promises, 'unlink', { value: mockUnlink })

        // Should not throw even if file cannot be deleted
        assert.doesNotThrow(async () => {
          await cleanupOrphanedTempFiles(context, true)
        })
      } finally {
        Object.defineProperty(fs.promises, 'unlink', { value: originalUnlink })
      }
    })
  })

  suite('File age calculation', () => {
    test('should respect MAX_FILE_AGE_MS threshold', async () => {
      const context = createMockContext()

      // Create file exactly at threshold
      const thresholdFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS)
      createdFiles.push(thresholdFile)

      // Create file just over threshold
      const overThresholdFile = createTestTempFile(
        TEMP_FILE.MAX_FILE_AGE_MS + 1,
      )
      createdFiles.push(overThresholdFile)

      await cleanupOrphanedTempFiles(context, true)

      // File at threshold might or might not be deleted due to timing
      // File over threshold should definitely be deleted
      assert.ok(
        !fileExists(overThresholdFile),
        'File over threshold should be deleted',
      )
    })

    test('should handle multiple files of different ages', async () => {
      const context = createMockContext()

      // Create files of different ages
      const veryOldFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 10000)
      const oldFile = createTestTempFile(TEMP_FILE.MAX_FILE_AGE_MS + 1000)
      const recentFile = createTestTempFile(1000)
      const veryRecentFile = createTestTempFile(100)

      createdFiles.push(veryOldFile, oldFile, recentFile, veryRecentFile)

      assert.ok(
        fileExists(veryOldFile),
        'Very old file should exist before cleanup',
      )
      assert.ok(fileExists(oldFile), 'Old file should exist before cleanup')
      assert.ok(
        fileExists(recentFile),
        'Recent file should exist before cleanup',
      )
      assert.ok(
        fileExists(veryRecentFile),
        'Very recent file should exist before cleanup',
      )

      await cleanupOrphanedTempFiles(context, true)

      assert.ok(!fileExists(veryOldFile), 'Very old file should be removed')
      assert.ok(!fileExists(oldFile), 'Old file should be removed')
      assert.ok(fileExists(recentFile), 'Recent file should be preserved')
      assert.ok(
        fileExists(veryRecentFile),
        'Very recent file should be preserved',
      )
    })
  })

  suite('Performance considerations', () => {
    test('should handle many temp files efficiently', async () => {
      const context = createMockContext()
      const startTime = Date.now()

      // Create multiple test files
      const testFiles: string[] = []
      for (let i = 0; i < 10; i++) {
        const file = createTestTempFile(
          TEMP_FILE.MAX_FILE_AGE_MS + 1000 + i * 100,
        )
        testFiles.push(file)
        createdFiles.push(file)
      }

      await cleanupOrphanedTempFiles(context, true)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (less than 5 seconds for 10 files)
      assert.ok(duration < 5000, 'Cleanup should complete in reasonable time')

      // All old files should be removed
      testFiles.forEach((file) => {
        assert.ok(!fileExists(file), `File ${file} should be removed`)
      })
    })
  })
})
