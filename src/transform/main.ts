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
    ['upperletter', 'upperletter(n)'],
    ['lowerletter', 'lowerletter(n)'],
    ['letter', 'letter(n)'],
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

    const vars = {
      /**
       * `s`: each selected text string (exact, untrimmed)
       */
      s: selectedText,

      /**
       * `n`: each selected text string as number (converted by removing non-numeric characters)
       */
      n: number(selectedText),

      /**
       * `i0`: index (position / ordinal) of each selected string, 0-based
       */
      i0: index,

      /**
       * `i`: index (position / ordinal) of each selected string, 1-based
       */
      i: index + 1,

      /**
       * `l`: total count of selected strings / length of the array of selected strings
       */
      l: selections.length,

      /**
       * `ss`: array of selected strings
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
       * `li0`: line index relative to first selection, 0-based
       */
      li0: selection.start.line - firstLine,

      /**
       * `li`: line index relative to first selection, 1-based
       */
      li: selection.start.line - firstLine + 1,

      /**
       * `fli0`: absolute line index in file, 0-based
       */
      fli0: selection.start.line,

      /**
       * `fli`: absolute line index in file, 1-based
       */
      fli: selection.start.line + 1,

      /**
       * `wl`: the whole line as string
       */
      wl: editor.document.lineAt(selection.start.line).text,

      /**
       * `len`: length of selected string (UTF-16 code units)
       */
      len: selectedText.length,

      /**
       * `cc`: character count (better than len for emoji)
       */
      cc: [...selectedText].length,

      /**
       * `wc`: word count (simple whitespace-based counting)
       */
      wc: selectedText
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length,

      /**
       * `selection`: vscode.Selection object representing current selection
       */
      selection,

      /**
       * `selections`: array of all vscode.Selection objects
       */
      selections,

      /**
       * `convnum`: convnum library
       */
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
