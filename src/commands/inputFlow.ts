import * as vscode from 'vscode'
import { PREVIEW_DEBOUNCE_MS } from '../const/const'
import { TEXT } from '../const/text'
import { applyReplacements } from '../editor/apply'
import {
  clearPreview,
  renderPreview,
  type PreviewItem,
} from '../editor/preview'

/** What an expression or range produced for the current selections. */
export interface Computation {
  /** One entry per selection, in document order. `null` leaves that selection alone. */
  readonly replacements: readonly (string | null)[]
  /**
   * What to draw for each selection, alongside `replacements`.
   *
   * Kept separate because `null` is ambiguous on the way in: a transform that threw and
   * a sequence that ran out of values both leave the selection alone, but only the first
   * is an error worth warning about. Each command says which it meant.
   */
  readonly previews: readonly PreviewItem[]
  /** How many selections the expression threw for. */
  readonly failures: number
  /** The first failure's message, for the notification when everything failed. */
  readonly firstFailureMessage?: string
}

/**
 * The result of interpreting what the user typed.
 *
 * `ok: false` means the whole input is unusable — a syntax error, or a range nothing
 * can be made of — and Enter stays blocked.
 */
export type ComputeOutcome =
  | { readonly ok: true; readonly computation: Computation }
  | { readonly ok: false; readonly message: string }

export interface InputFlowOptions {
  readonly title: string
  readonly prompt: string
  readonly placeholder: string
  /** Shown while the box is empty, so Enter does nothing until something is typed. */
  readonly emptyMessage: string
  /** Where the last accepted value is remembered. */
  readonly historyKey: string
  readonly rememberLastInput: boolean
  readonly previewMaxLength: number
  compute(value: string): ComputeOutcome
}

/**
 * Drives one "type something, watch it, press Enter" command.
 *
 * Uses `createInputBox` rather than `showInputBox` + `validateInput`. The latter is a
 * predicate, not an event: it carries a fixed 100 ms debounce on the window side, each
 * call is a cross-process round trip, it fires once eagerly with the initial value and again
 * on accept, and it offers no hook for cleaning up when the user presses Escape.
 * `onDidChangeValue` + `onDidHide` give the timing and the teardown this needs.
 */
export async function runInputFlow(
  editor: vscode.TextEditor,
  ordered: readonly vscode.Selection[],
  decorationType: vscode.TextEditorDecorationType,
  memento: vscode.Memento,
  options: InputFlowOptions,
): Promise<void> {
  const box = vscode.window.createInputBox()
  box.title = options.title
  box.prompt = options.prompt
  box.placeholder = options.placeholder

  if (options.rememberLastInput) {
    const previous = memento.get<string>(options.historyKey, '')
    if (previous !== '') {
      box.value = previous
      // Select it all, so typing replaces the suggestion but Enter keeps it.
      box.valueSelection = [0, previous.length]
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let latest: Computation | undefined

  const update = (value: string): void => {
    if (value.trim() === '') {
      latest = undefined
      box.validationMessage = {
        message: options.emptyMessage,
        severity: vscode.InputBoxValidationSeverity.Info,
      }
      clearPreview(editor, decorationType)
      return
    }

    const outcome = options.compute(value)
    if (!outcome.ok) {
      latest = undefined
      box.validationMessage = {
        message: outcome.message,
        severity: vscode.InputBoxValidationSeverity.Error,
      }
      clearPreview(editor, decorationType)
      return
    }

    latest = outcome.computation
    box.validationMessage =
      outcome.computation.failures > 0
        ? {
            message: `${outcome.computation.failures} of ${ordered.length} selections will be left unchanged.`,
            severity: vscode.InputBoxValidationSeverity.Warning,
          }
        : undefined

    renderPreview(
      editor,
      decorationType,
      ordered,
      outcome.computation.previews,
      options.previewMaxLength,
    )
  }

  box.onDidChangeValue((value) => {
    clearTimeout(timer)
    timer = setTimeout(() => update(value), PREVIEW_DEBOUNCE_MS)
  })

  const accepted = await new Promise<Computation | undefined>((resolve) => {
    let settled: Computation | undefined

    box.onDidAccept(() => {
      // The debounce may not have fired yet for the latest keystroke.
      clearTimeout(timer)
      update(box.value)
      if (latest === undefined) {
        return
      }
      settled = latest
      if (options.rememberLastInput) {
        void memento.update(options.historyKey, box.value)
      }
      box.hide()
    })

    box.onDidHide(() => {
      clearTimeout(timer)
      clearPreview(editor, decorationType)
      box.dispose()
      resolve(settled)
    })

    // Render the remembered value straight away, so the preview is there on open.
    update(box.value)
    box.show()
  })

  if (accepted === undefined) {
    return
  }

  await applyComputation(editor, ordered, accepted)
}

/**
 * Writes a computation into the document and reports what happened.
 *
 * Returns whether anything was written. The caller needs to know: the advanced editor
 * keeps its scratch file when an apply does not go through, and every "nothing happened"
 * path here — every selection failing, VS Code refusing the edit, the editor having gone
 * away — used to return like a success and take the user's script down with it. Each of
 * those paths has already shown the user a message, so the caller must not add another.
 */
export async function applyComputation(
  editor: vscode.TextEditor,
  ordered: readonly vscode.Selection[],
  computation: Computation,
): Promise<boolean> {
  if (computation.failures === ordered.length && ordered.length > 0) {
    void vscode.window.showErrorMessage(
      TEXT.allFailed(computation.firstFailureMessage ?? 'unknown error'),
    )
    return false
  }

  const changed = await applyReplacements(
    editor,
    ordered,
    computation.replacements,
  )
  if (changed === undefined) {
    // The edit never happened; `applyReplacements` has already said why.
    return false
  }

  if (computation.failures > 0) {
    void vscode.window.showWarningMessage(
      TEXT.appliedWithFailures(changed, computation.failures),
    )
  }
  return true
}
