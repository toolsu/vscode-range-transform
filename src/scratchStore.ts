import * as vscode from 'vscode'
import { SCRATCH } from './const/const'
import { CONVNUM_DTS, RT_GLOBALS_DTS } from './generated/dts'

const encoder = new TextEncoder()

/**
 * Where advanced-transform scratch files live.
 *
 * `globalStorageUri` rather than `os.tmpdir()`: the directory belongs to this extension,
 * survives a crash, is not world-readable, cannot be swept away mid-session by
 * systemd-tmpfiles or macOS's periodic cleaner, and VS Code removes it on uninstall.
 * `storageUri` would have been wrong — it is `undefined` when no folder is open.
 *
 * The directory is not created for us; only its parent is guaranteed to exist.
 */
export function scratchDirectory(context: vscode.ExtensionContext): vscode.Uri {
  return context.globalStorageUri
}

/**
 * Creates the scratch directory and writes the two declaration files into it.
 *
 * `rt.d.ts` is what the scratch file's triple-slash reference points at, and it in turn
 * refers to convnum as `typeof import('./convnum')` — so both files have to be present
 * for hover documentation and completion to work. They are rewritten on every
 * invocation, which keeps them in step after an extension update.
 */
export async function prepareScratchDirectory(
  context: vscode.ExtensionContext,
): Promise<{ directory: vscode.Uri; globals: vscode.Uri }> {
  const directory = scratchDirectory(context)
  await vscode.workspace.fs.createDirectory(directory)

  const globals = vscode.Uri.joinPath(directory, SCRATCH.globalsFileName)
  const convnum = vscode.Uri.joinPath(directory, SCRATCH.convnumFileName)

  await vscode.workspace.fs.writeFile(globals, encoder.encode(RT_GLOBALS_DTS))
  await vscode.workspace.fs.writeFile(convnum, encoder.encode(CONVNUM_DTS))

  return { directory, globals }
}

/** Creates a scratch file with a name the `when` clauses in package.json match. */
export async function writeScratchFile(
  directory: vscode.Uri,
  contents: string,
): Promise<vscode.Uri> {
  const name = `${SCRATCH.filePrefix}${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}${SCRATCH.fileSuffix}`
  const uri = vscode.Uri.joinPath(directory, name)
  await vscode.workspace.fs.writeFile(uri, encoder.encode(contents))
  return uri
}

/** Deletes a scratch file, ignoring the case where it is already gone. */
export async function deleteScratchFile(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.delete(uri, { useTrash: false })
  } catch {
    // Already removed, or the storage directory was cleared. Nothing to do.
  }
}

/**
 * Removes scratch files left behind by a crash or a force-quit.
 *
 * Runs once on activation. A `readDirectory` over a directory holding a handful of
 * small files is cheap enough that the previous once-per-day throttle, and the
 * `globalState` bookkeeping it needed, were not worth their complexity.
 */
export async function sweepScratchDirectory(
  context: vscode.ExtensionContext,
): Promise<void> {
  const directory = scratchDirectory(context)

  let entries: [string, vscode.FileType][]
  try {
    entries = await vscode.workspace.fs.readDirectory(directory)
  } catch {
    // The directory has not been created yet, which is the common case.
    return
  }

  const cutoff = Date.now() - SCRATCH.maxAgeMs

  await Promise.all(
    entries.map(async ([name, type]) => {
      if (
        type !== vscode.FileType.File ||
        !name.startsWith(SCRATCH.filePrefix)
      ) {
        return
      }
      const uri = vscode.Uri.joinPath(directory, name)
      try {
        const stat = await vscode.workspace.fs.stat(uri)
        if (stat.mtime < cutoff) {
          await vscode.workspace.fs.delete(uri, { useTrash: false })
        }
      } catch {
        // Raced with another window sweeping the same directory.
      }
    }),
  )
}
