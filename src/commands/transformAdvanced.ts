import * as vscode from 'vscode'
import { readSettings, type Settings } from '../config'
import {
  SCRATCH,
  SCRATCH_CONTEXT_KEY,
  SCRATCH_PREVIEW_DEBOUNCE_MS,
  SCRATCH_SAVE_DEBOUNCE_MS,
} from '../const/const'
import { TEXT } from '../const/text'
import {
  clearPreview,
  renderPreview,
  type PreviewItem,
} from '../editor/preview'
import { orderSelections, snapshotSelections } from '../editor/selections'
import {
  deleteScratchFile,
  prepareScratchDirectory,
  writeScratchFile,
} from '../scratchStore'
import { isBlankExpression, runTransform } from '../transform'
import { buildScratchContent } from '../transform/scratch'
import type { SelectionSnapshot } from '../transform/vars'
import { applyComputation } from './inputFlow'
import { toComputation } from './transform'

interface ScratchSession {
  /** The scratch file. */
  readonly uri: vscode.Uri
  /** The scratch document. */
  readonly document: vscode.TextDocument
  /**
   * The document the selections came from.
   *
   * The *document* rather than the editor, deliberately. VS Code identifies an ext-host
   * editor by widget and model together and disposes it as soon as its group shows
   * something else, so an editor captured when the session opened is dead the moment the
   * user clicks another tab in that group — and `edit()` on it rejects with
   * "TextEditor#edit not possible on closed editors". A document survives that, so the
   * editor is resolved from it at the moment it is needed.
   */
  readonly sourceDocument: vscode.TextDocument
  /** Where the source document was, so it can be brought back to the same place. */
  readonly sourceViewColumn: vscode.ViewColumn | undefined
  readonly ordered: readonly vscode.Selection[]
  readonly snapshot: SelectionSnapshot
  readonly settings: Settings
  readonly decorationType: vscode.TextEditorDecorationType
  readonly disposables: vscode.Disposable[]
  /**
   * The expression as the user last left it.
   *
   * Tracked rather than read back from the document at apply time, because closing a tab
   * whose buffer is still dirty makes VS Code restore the on-disk content first. Reading
   * the document at that point would apply the untouched template — a transform that
   * silently does nothing — instead of what the user wrote.
   */
  latestText: string
  /**
   * The text last written to disk.
   *
   * The close-time revert is a change *to exactly the on-disk content*, which is what
   * makes it recognisable. `TextDocumentChangeEvent.reason` cannot be used on its own —
   * it is `undefined` for a plain edit too — but it does mark undo and redo, so pairing
   * the two tells a revert apart from an undo that happens to land on the saved text.
   */
  savedText: string
  /**
   * Set once the source document changes underneath the session.
   *
   * The captured selections are plain ranges; they do not move when the document is
   * edited, while the preview decorations do. Applying after an edit would therefore
   * rewrite whatever now sits at the old offsets. Once stale, the session refuses to
   * apply and says why.
   */
  stale: boolean
  previewTimer?: ReturnType<typeof setTimeout>
  saveTimer?: ReturnType<typeof setTimeout>
  /**
   * Set while the session is being wound up, so closing the tab ourselves does not
   * re-enter through the tab-close listener.
   */
  finishing: boolean
}

/** At most one advanced transform at a time. */
let session: ScratchSession | null = null

/**
 * Set while a scratch file is being opened.
 *
 * Opening spans four awaits before `session` is assigned, so without this a second
 * invocation in that window would see `session === null`, open its own scratch tab and
 * overwrite the module-level session — leaving the first tab orphaned, wired to nothing,
 * and unable to clean itself up.
 */
let opening = false

function tabsFor(uri: vscode.Uri): vscode.Tab[] {
  const target = uri.toString()
  return vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter(
      (tab) =>
        tab.input instanceof vscode.TabInputText &&
        tab.input.uri.toString() === target,
    )
}

async function setScratchContext(open: boolean): Promise<void> {
  await vscode.commands.executeCommand('setContext', SCRATCH_CONTEXT_KEY, open)
}

/** The visible editor showing the source document, if it is on screen right now. */
function visibleSourceEditor(
  current: ScratchSession,
): vscode.TextEditor | undefined {
  return vscode.window.visibleTextEditors.find(
    (editor) => editor.document === current.sourceDocument,
  )
}

/**
 * Returns a live editor for the source document, reopening it if it has been hidden.
 *
 * Called at apply time. Reopening is deliberate: the alternative is to fail because the
 * user glanced at another tab while composing.
 */
async function resolveSourceEditor(
  current: ScratchSession,
): Promise<vscode.TextEditor> {
  return (
    visibleSourceEditor(current) ??
    (await vscode.window.showTextDocument(current.sourceDocument, {
      viewColumn: current.sourceViewColumn,
      preserveFocus: true,
      preview: false,
    }))
  )
}

function clearSourcePreview(current: ScratchSession): void {
  const editor = visibleSourceEditor(current)
  if (editor) {
    clearPreview(editor, current.decorationType)
  }
}

function disposeSession(current: ScratchSession): void {
  clearTimeout(current.previewTimer)
  clearTimeout(current.saveTimer)
  current.disposables.forEach((disposable) => disposable.dispose())
  clearSourcePreview(current)
  if (session === current) {
    session = null
  }
  void setScratchContext(false)
  void deleteScratchFile(current.uri)
}

function updatePreview(current: ScratchSession): void {
  const editor = visibleSourceEditor(current)
  if (!editor) {
    // Nothing to draw on. The preview reappears on its own the next time the user types,
    // once the source document is back on screen.
    return
  }

  if (current.stale) {
    clearPreview(editor, current.decorationType)
    return
  }

  const code = current.latestText
  if (isBlankExpression(code)) {
    clearPreview(editor, current.decorationType)
    return
  }

  const result = runTransform(current.snapshot, code)
  if (!result.ok) {
    // A half-typed expression is a syntax error most of the time; showing nothing is
    // quieter than flashing an error on every keystroke.
    clearPreview(editor, current.decorationType)
    return
  }

  const items: PreviewItem[] = result.items.map((item) =>
    item.ok ? { kind: 'replace', text: item.text } : { kind: 'error' },
  )
  renderPreview(
    editor,
    current.decorationType,
    current.ordered,
    items,
    current.settings.previewMaxLength,
  )
}

/** Writes the scratch buffer to disk now, cancelling any pending debounced save. */
async function flushSave(current: ScratchSession): Promise<void> {
  clearTimeout(current.saveTimer)
  current.saveTimer = undefined
  const pending = current.latestText
  try {
    if (await current.document.save()) {
      current.savedText = pending
    }
  } catch {
    // Saving failed. Closing may then prompt, which is better than losing the tab.
  }
}

/**
 * Closes the scratch tab.
 *
 * Saving first keeps the buffer clean, so the user is never asked whether to keep a
 * scratch file they never thought of as a file.
 */
async function closeScratchTab(current: ScratchSession): Promise<void> {
  const tabs = tabsFor(current.uri)
  if (tabs.length === 0) {
    return
  }
  await flushSave(current)
  await vscode.window.tabGroups.close(tabs)
}

/**
 * Puts the scratch editor back on screen after a refused apply.
 *
 * Refusing without this would be the worst of both worlds: the tab is already gone on the
 * close path, so the expression the user spent time on would be unreachable even though
 * the extension is telling them to fix it.
 */
async function reopenScratchTab(current: ScratchSession): Promise<void> {
  if (tabsFor(current.uri).length > 0) {
    return
  }
  try {
    const editor = await vscode.window.showTextDocument(current.document, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: false,
    })
    // The document may have been reverted to its last saved state on the way out.
    if (editor.document.getText() !== current.latestText) {
      await editor.edit((builder) => {
        const lastLine = editor.document.lineCount - 1
        builder.replace(
          new vscode.Range(
            new vscode.Position(0, 0),
            editor.document.lineAt(lastLine).range.end,
          ),
          current.latestText,
        )
      })
    }
  } catch {
    // The document is gone; there is nothing left to put back.
  }
}

/**
 * Keeps the session alive after a refused apply, restoring the editor if needed.
 *
 * `message` is omitted when the refusal has already been reported — `applyComputation`
 * explains every one of its own failures, and two toasts for one event is worse than
 * none.
 */
async function refuse(
  current: ScratchSession,
  message?: string,
): Promise<void> {
  if (message !== undefined) {
    void vscode.window.showErrorMessage(message)
  }
  await reopenScratchTab(current)
  current.finishing = false
}

/**
 * Winds up the session.
 *
 * `apply` follows the model VS Code's Git extension uses for commit messages: closing the
 * editor is what commits, and an emptied-out buffer means cancel. A syntax error and a
 * document that has moved on are the two cases that refuse instead — discarding work over
 * a typo, or rewriting the wrong text, would both be worse than an interruption.
 */
async function finish(
  mode: 'apply' | 'cancel',
  alreadyClosed: boolean,
): Promise<void> {
  const current = session
  if (!current || current.finishing) {
    return
  }
  current.finishing = true

  if (mode === 'apply') {
    const code = current.latestText

    if (current.stale) {
      // A stale session can never become valid again, so reopening the editor on the
      // close path would be a trap: every attempt to dismiss it would resurrect it. The
      // explicit Apply button keeps it open instead, which is what lets the user copy
      // their script out before starting over.
      if (alreadyClosed) {
        void vscode.window.showInformationMessage(TEXT.advancedStaleDiscarded)
        disposeSession(current)
        return
      }
      await refuse(current, TEXT.advancedStale)
      return
    }

    if (isBlankExpression(code)) {
      void vscode.window.showInformationMessage(TEXT.advancedNothingToApply)
    } else {
      const outcome = toComputation(runTransform(current.snapshot, code))
      if (!outcome.ok) {
        await refuse(current, TEXT.advancedInvalidExpression(outcome.message))
        return
      }

      let applied: boolean
      try {
        const editor = await resolveSourceEditor(current)
        applied = await applyComputation(
          editor,
          current.ordered,
          outcome.computation,
        )
      } catch (error) {
        await refuse(
          current,
          TEXT.advancedApplyFailed(
            error instanceof Error ? error.message : String(error),
          ),
        )
        return
      }

      // Nothing was written — every selection failed, or VS Code refused the edit. The
      // script that produced it is the only copy the user has, so keep it.
      if (!applied) {
        await refuse(current)
        return
      }
    }
  }

  if (!alreadyClosed) {
    await closeScratchTab(current)
  }
  disposeSession(current)
}

/** Moves the cursor onto the placeholder expression, ready to be typed over. */
function selectPlaceholder(
  editor: vscode.TextEditor,
  document: vscode.TextDocument,
): void {
  for (let line = document.lineCount - 1; line >= 0; line -= 1) {
    const text = document.lineAt(line).text
    const column = text.indexOf(SCRATCH.placeholder)
    if (column !== -1 && text.trim() === SCRATCH.placeholder) {
      const selection = new vscode.Selection(
        new vscode.Position(line, column),
        new vscode.Position(line, column + SCRATCH.placeholder.length),
      )
      editor.selection = selection
      editor.revealRange(selection, vscode.TextEditorRevealType.InCenter)
      return
    }
  }
}

/** Registers everything the session listens to. */
function installListeners(current: ScratchSession): void {
  const { document, sourceDocument, uri } = current

  current.disposables.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document !== document || current.finishing) {
        return
      }

      const text = event.document.getText()

      // Closing a tab whose buffer is still dirty makes VS Code restore the on-disk
      // content and fire this event before the tab actually goes. Treating that as an
      // edit would replace what the user wrote with the untouched template, so closing
      // to apply would silently do nothing. Undo and redo can land on the same text, so
      // they are excluded by `reason` — only they carry one.
      if (
        event.reason === undefined &&
        text === current.savedText &&
        text !== current.latestText
      ) {
        return
      }
      current.latestText = text

      clearTimeout(current.previewTimer)
      current.previewTimer = setTimeout(
        () => updatePreview(current),
        SCRATCH_PREVIEW_DEBOUNCE_MS,
      )

      // Keeping the buffer saved is what stops the close path ever reaching the save
      // prompt, and it means the on-disk file survives a force-quit.
      clearTimeout(current.saveTimer)
      current.saveTimer = setTimeout(() => {
        void flushSave(current)
      }, SCRATCH_SAVE_DEBOUNCE_MS)
    }),
  )

  current.disposables.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        event.document !== sourceDocument ||
        current.finishing ||
        current.stale ||
        event.contentChanges.length === 0
      ) {
        return
      }
      // The captured selections are fixed ranges. Once the document moves under them
      // they describe different text, so say so now rather than at apply time — the
      // decorations shift with the edit and would otherwise keep implying all is well.
      current.stale = true
      clearSourcePreview(current)
      void vscode.window.showWarningMessage(TEXT.advancedSourceChanged)
    }),
  )

  current.disposables.push(
    vscode.workspace.onDidCloseTextDocument((closed) => {
      if (closed !== sourceDocument || current.finishing || current.stale) {
        return
      }
      // Reopening the same file produces a *different* `TextDocument` object, so the
      // captured one would never match a visible editor again: the preview would go
      // quiet and the captured offsets would be applied to whatever the file holds now,
      // which may have changed on disk while it was closed. For an untitled document
      // the content is gone outright.
      current.stale = true
      void vscode.window.showWarningMessage(TEXT.advancedSourceChanged)
    }),
  )

  current.disposables.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      // Leaving the scratch editor is the usual prelude to closing it, and the debounced
      // save may still be pending. Flushing here narrows the window in which a close
      // would raise the save prompt.
      if (!current.finishing && current.saveTimer !== undefined) {
        void flushSave(current)
      }
    }),
  )

  current.disposables.push(
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      if (current.finishing) {
        return
      }
      const target = uri.toString()
      const closed = event.closed.some(
        (tab) =>
          tab.input instanceof vscode.TabInputText &&
          tab.input.uri.toString() === target,
      )
      if (!closed) {
        return
      }

      // `closed` also fires when a tab is dragged into another group or when a preview
      // tab is replaced, which report a close followed by an open. Re-scan before
      // treating it as the user finishing.
      setTimeout(() => {
        if (session !== current || current.finishing) {
          return
        }
        if (tabsFor(uri).length > 0) {
          return
        }
        void finish('apply', true)
      }, 50)
    }),
  )
}

export async function transformAdvancedCommand(
  context: vscode.ExtensionContext,
  decorationType: vscode.TextEditorDecorationType,
): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    void vscode.window.showErrorMessage(TEXT.noActiveEditor)
    return
  }

  const ordered = orderSelections(editor.selections)
  if (ordered.length === 0) {
    void vscode.window.showErrorMessage(TEXT.noSelections)
    return
  }

  if (opening) {
    return
  }
  opening = true

  let created: vscode.Uri | undefined
  try {
    if (session) {
      await finish('cancel', false)
    }

    const { directory, globals } = await prepareScratchDirectory(context)
    const contents = buildScratchContent({
      globalsPath: globals.fsPath,
      selectionCount: ordered.length,
      documentName:
        editor.document.fileName.split(/[\\/]/).pop() ?? 'this file',
    })

    const uri = await writeScratchFile(directory, contents)
    created = uri
    const document = await vscode.workspace.openTextDocument(uri)
    // Beside, so the original document stays visible — decorations render on any visible
    // editor, which is what makes the live preview work from here.
    const scratchEditor = await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: false,
    })
    selectPlaceholder(scratchEditor, document)

    const current: ScratchSession = {
      uri,
      document,
      sourceDocument: editor.document,
      sourceViewColumn: editor.viewColumn,
      ordered,
      snapshot: snapshotSelections(editor.document, ordered),
      settings: readSettings(editor.document.uri),
      decorationType,
      disposables: [],
      latestText: contents,
      savedText: contents,
      stale: false,
      finishing: false,
    }
    session = current
    created = undefined

    installListeners(current)
    await setScratchContext(true)
    updatePreview(current)
  } catch (error) {
    void vscode.window.showErrorMessage(
      TEXT.advancedScratchFailed(
        error instanceof Error ? error.message : String(error),
      ),
    )
    // Only clean up what this invocation created. Tearing down `session` here would kill
    // a healthy session that a later invocation had already installed.
    if (created) {
      void deleteScratchFile(created)
    }
  } finally {
    opening = false
  }
}

/** Backs the `$(check) Apply` title-bar button and `ctrl+enter`. */
export async function applyScratchCommand(): Promise<void> {
  await finish('apply', false)
}

/** Backs the `$(close) Cancel` title-bar button. */
export async function cancelScratchCommand(): Promise<void> {
  await finish('cancel', false)
}

/** Cancels any in-flight session, for deactivation. */
export function disposeAdvancedSession(): void {
  if (session) {
    disposeSession(session)
  }
}
