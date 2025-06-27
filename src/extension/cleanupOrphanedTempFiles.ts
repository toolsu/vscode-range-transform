import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { TEMP_FILE } from '@/const/const'

/**
 * Clean up orphaned range-transform temporary files
 * @param context VS Code extension context for storing cleanup timestamps
 * @param forceCleanup Force cleanup regardless of last cleanup time
 */
export const cleanupOrphanedTempFiles = async (
  context?: vscode.ExtensionContext,
  forceCleanup = false,
): Promise<void> => {
  try {
    // Check if we should skip cleanup based on last cleanup time
    if (!forceCleanup && context) {
      const lastCleanup = context.workspaceState.get<number>(
        'rangeTransformLastCleanup',
        0,
      )
      const now = Date.now()
      if (now - lastCleanup < TEMP_FILE.CLEANUP_INTERVAL_MS) {
        // Skip cleanup - was done within the configured interval
        return
      }
    }

    const tempDir = os.tmpdir()
    const files = await fs.promises.readdir(tempDir)

    // Filter for range-transform files
    const rangeTransformFiles = files.filter(
      (file) =>
        file.startsWith(TEMP_FILE.FILE_PREFIX) &&
        file.endsWith(TEMP_FILE.FILE_SUFFIX),
    )

    if (rangeTransformFiles.length === 0) {
      // Update last cleanup time and return
      if (context) {
        await context.workspaceState.update(
          'rangeTransformLastCleanup',
          Date.now(),
        )
      }
      return
    }

    const now = Date.now()
    let cleanedCount = 0

    // Process files with cleanup criteria
    for (const file of rangeTransformFiles) {
      try {
        const filePath = path.join(tempDir, file)
        const stats = await fs.promises.stat(filePath)

        // Delete files older than the configured age threshold
        if (now - stats.mtime.getTime() > TEMP_FILE.MAX_FILE_AGE_MS) {
          await fs.promises.unlink(filePath)
          cleanedCount++
        }
      } catch (error) {
        // Ignore individual file errors (file might be in use or already deleted)
        continue
      }
    }

    // Update last cleanup time
    if (context) {
      await context.workspaceState.update('rangeTransformLastCleanup', now)
    }

    // Optional: Log cleanup results for debugging
    if (cleanedCount > 0) {
      console.log(
        `[Range Transform] Cleaned up ${cleanedCount} orphaned temp files`,
      )
    }
  } catch (error) {
    // Silently ignore cleanup errors to avoid disrupting normal operation
    console.warn('[Range Transform] Temp file cleanup failed:', error)
  }
}
