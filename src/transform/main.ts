import * as vscode from 'vscode'
import {
  number,
  letter,
  upperletter,
  lowerletter,
  upper,
  lower,
} from './helpers'
import { localEval } from './localEval'
import * as convnum from 'convnum'

/**
 * Process the command by replacing shorthand notation with function calls
 */
function processCommand(command: string): string {
  let processedCommand = command

  // Replace shorthand notation with function calls
  const replacements = [
    ['number', 'number(s)'],
    ['letter', 'letter(n)'],
    ['upperletter', 'upperletter(n)'],
    ['lowerletter', 'lowerletter(n)'],
    ['upper', 'upper(s)'],
    ['lower', 'lower(s)'],
  ]

  replacements.forEach(([word, replacement]) => {
    // Replace word boundaries that are not followed by parentheses
    const regex = new RegExp(`\\b${word}\\b(?!\\()`, 'g')
    processedCommand = processedCommand.replace(regex, replacement)
  })

  return processedCommand
}

/**
 * Transform selections using JavaScript expressions
 */
export function transformSelections(
  editor: vscode.TextEditor,
  selections: readonly vscode.Selection[],
  command: string,
  useSelectionOrder: boolean = false,
): string[] {
  const processedCommand = processCommand(command)
  const results: string[] = []

  // Create array with selections and their original indices
  const selectionsWithIndex = Array.from(selections).map(
    (selection, originalIndex) => ({
      selection,
      originalIndex,
    }),
  )

  // Sort by document order unless useSelectionOrder is true
  if (!useSelectionOrder) {
    selectionsWithIndex.sort((a, b) => {
      const lineCompare = a.selection.start.line - b.selection.start.line
      if (lineCompare !== 0) {
        return lineCompare
      }
      return a.selection.start.character - b.selection.start.character
    })
  }

  const firstLine = selectionsWithIndex[0]?.selection.start.line || 0

  // Get all selected texts for the ss variable
  const allSelectedTexts = selectionsWithIndex.map(({ selection }) =>
    editor.document.getText(selection),
  )

  selectionsWithIndex.forEach(({ selection }, index) => {
    const selectedText = editor.document.getText(selection)

    // The variable comment below will be used to generate the `usertypes/transform.d.ts` file
    // by the script `scripts/genTransformTypes.ts`, if you add a new variable with comment,
    // you also need to modify `scripts/genTransformTypes.ts`
    const vars = {
      /**
       * `s`: The exact selected text string (untrimmed)
       *
       * Example: If you select "hello", `s` is `"hello"`
       */
      s: selectedText,

      /**
       * `n`: Selected text converted to number
       *
       * Extracts number by removing all non-numeric characters except digits and decimal point
       *
       * Example: If you select "abc123def", `n` is `123`
       */
      n: number(selectedText),

      /**
       * `i0`: Selection index (0-based)
       *
       * The position of each selection, starting from 0
       *
       * Example: First selection's `i0` is `0`, second is `1`, etc.
       */
      i0: index,

      /**
       * `i`: Selection index (1-based)
       *
       * The position of each selection, starting from 1
       *
       * Example: First selection's `i` is `1`, second is `2`, etc.
       */
      i: index + 1,

      /**
       * `l`: Total count of selections
       *
       * If you have multiple selections, `l` is the total count of selections
       */
      l: selections.length,

      /**
       * `ss`: Array of all selected text strings
       *
       * Example: `["hello", "world", "test"]`
       */
      ss: allSelectedTexts,

      /**
       * Helper functions
       */
      number,
      letter,
      upperletter,
      lowerletter,
      upper,
      lower,

      /**
       * `li0`: Line index relative to first selection, first selection's line index is `0` (0-based)
       */
      li0: selection.start.line - firstLine,

      /**
       * `li`: Line index relative to first selection, first selection's line index is `1` (1-based)
       */
      li: selection.start.line - firstLine + 1,

      /**
       * `fli0`: Absolute file line index, first line's index is `0` (0-based)
       */
      fli0: selection.start.line,

      /**
       * `fli`: Absolute file line index, first line's index is `1` (1-based)
       */
      fli: selection.start.line + 1,

      /**
       * `wl`: Whole line text
       *
       * The entire line content of the point where the selection starts
       *
       * Example: If you select "hello" and the line is "hello world!", `wl` is `"hello world!"`
       */
      wl: editor.document.lineAt(selection.start.line).text,

      /**
       * `len`: String length (UTF-16 code units)
       *
       * Represents the number of UTF-16 code units in the string.
       * Most common characters count as 1, but some special characters and emojis may count as more.
       *
       * Example:
       * - If you select "hello", `len` is `5`
       * - If you select "你好", `len` is `2`
       *
       * @remarks Some special characters have a `len` greater than their visual length:
       * "😀" (`2`), "👨‍👩‍👧‍👦" (`11`), "नमस्ते" (`6`), "สวัสดี" (`6`).
       * If you're working with such characters, consider using `[...s].length`,
       * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter | Intl.Segmenter},
       * or other specific methods.
       */
      len: selectedText.length,

      /**
       * `wc`: Word count
       *
       * Number of words in the selection (whitespace-separated)
       *
       * Example: If you select "hello world", `wc` is `2`
       */
      wc: selectedText
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length,

      /**
       * `selection`: {@link https://code.visualstudio.com/api/references/vscode-api#Selection | `vscode.Selection`} object representing current selection
       */
      selection,

      /**
       * `selections`: array of all {@link https://code.visualstudio.com/api/references/vscode-api#Selection | `vscode.Selection`} objects
       */
      selections,

      convnum,
    }

    try {
      const result = localEval(processedCommand, vars)
      results.push(result?.toString() || '')
    } catch (error) {
      // For preview, show error indicator instead of throwing
      results.push(`[Error]`)
    }
  })

  return results
}
