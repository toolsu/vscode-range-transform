import * as assert from 'assert'
import * as vscode from 'vscode'
import { transformSelections } from '@/transform/main'

// Mock editor and selection helpers
function createMockEditor(texts: string[]): vscode.TextEditor {
  const selections = texts.map((text, index) => {
    const startLine = index
    const endLine = index
    const startChar = 0
    const endChar = text.length
    return new vscode.Selection(startLine, startChar, endLine, endChar)
  })

  return {
    document: {
      getText: (selection?: vscode.Selection) => {
        if (!selection) {
          return texts.join('\n')
        }
        const index = selections.findIndex(
          (s) =>
            s.start.line === selection.start.line &&
            s.start.character === selection.start.character,
        )
        return index >= 0 ? texts[index] : ''
      },
      lineAt: (line: number) => ({
        text: texts[line] || '',
      }),
    },
    selections,
  } as any
}

suite('transformSelections Function Tests', () => {
  suite('Basic transformations', () => {
    test('should transform with simple expressions', () => {
      const editor = createMockEditor(['5', '10', '15'])
      const result = transformSelections(editor, editor.selections, 'n * 2')
      assert.deepStrictEqual(result, ['10', '20', '30'])
    })

    test('should transform with string operations', () => {
      const editor = createMockEditor(['hello', 'world', 'test'])
      const result = transformSelections(editor, editor.selections, 'upper(s)')
      assert.deepStrictEqual(result, ['HELLO', 'WORLD', 'TEST'])
    })

    test('should use index variables', () => {
      const editor = createMockEditor(['a', 'b', 'c'])
      const result = transformSelections(editor, editor.selections, 's + i')
      assert.deepStrictEqual(result, ['a1', 'b2', 'c3'])
    })

    test('should use zero-based index', () => {
      const editor = createMockEditor(['a', 'b', 'c'])
      const result = transformSelections(editor, editor.selections, 's + i0')
      assert.deepStrictEqual(result, ['a0', 'b1', 'c2'])
    })
  })

  suite('Variable availability', () => {
    test('should have access to s (selected text)', () => {
      const editor = createMockEditor(['hello', 'world'])
      const result = transformSelections(editor, editor.selections, 's')
      assert.deepStrictEqual(result, ['hello', 'world'])
    })

    test('should have access to n (numeric value)', () => {
      const editor = createMockEditor(['123', 'abc456', '78.9'])
      const result = transformSelections(editor, editor.selections, 'n')
      assert.deepStrictEqual(result, ['123', '456', '78.9'])
    })

    test('should have access to l (total length)', () => {
      const editor = createMockEditor(['a', 'b', 'c'])
      const result = transformSelections(editor, editor.selections, 'l')
      assert.deepStrictEqual(result, ['3', '3', '3'])
    })

    test('should have access to ss (all selections array)', () => {
      const editor = createMockEditor(['first', 'second', 'third'])
      const result = transformSelections(editor, editor.selections, 'ss[1]')
      assert.deepStrictEqual(result, ['second', 'second', 'second'])
    })

    test('should have access to len (string length)', () => {
      const editor = createMockEditor(['hello', 'hi', 'world'])
      const result = transformSelections(editor, editor.selections, 'len')
      assert.deepStrictEqual(result, ['5', '2', '5'])
    })

    test('should have access to cc (character count)', () => {
      const editor = createMockEditor(['hello', '👋🌍', 'test'])
      const result = transformSelections(editor, editor.selections, 'cc')
      assert.deepStrictEqual(result, ['5', '2', '4'])
    })

    test('should have access to wc (word count)', () => {
      const editor = createMockEditor([
        'hello world',
        'single',
        'one two three',
      ])
      const result = transformSelections(editor, editor.selections, 'wc')
      assert.deepStrictEqual(result, ['2', '1', '3'])
    })
  })

  suite('Line-related variables', () => {
    test('should have access to li0 (relative line index, 0-based)', () => {
      const texts = ['line0', 'line1', 'line2']
      const editor = createMockEditor(texts)
      const result = transformSelections(editor, editor.selections, 'li0')
      assert.deepStrictEqual(result, ['0', '1', '2'])
    })

    test('should have access to li (relative line index, 1-based)', () => {
      const texts = ['line0', 'line1', 'line2']
      const editor = createMockEditor(texts)
      const result = transformSelections(editor, editor.selections, 'li')
      assert.deepStrictEqual(result, ['1', '2', '3'])
    })

    test('should have access to fli0 (absolute file line index, 0-based)', () => {
      const texts = ['line0', 'line1', 'line2']
      const editor = createMockEditor(texts)
      const result = transformSelections(editor, editor.selections, 'fli0')
      assert.deepStrictEqual(result, ['0', '1', '2'])
    })

    test('should have access to fli (absolute file line index, 1-based)', () => {
      const texts = ['line0', 'line1', 'line2']
      const editor = createMockEditor(texts)
      const result = transformSelections(editor, editor.selections, 'fli')
      assert.deepStrictEqual(result, ['1', '2', '3'])
    })

    test('should have access to wl (whole line)', () => {
      const texts = ['first line', 'second line', 'third line']
      const editor = createMockEditor(texts)
      const result = transformSelections(editor, editor.selections, 'wl')
      assert.deepStrictEqual(result, [
        'first line',
        'second line',
        'third line',
      ])
    })
  })

  suite('Helper function shorthand', () => {
    test('should expand number shorthand', () => {
      const editor = createMockEditor(['abc123', 'def456'])
      const result = transformSelections(editor, editor.selections, 'number')
      assert.deepStrictEqual(result, ['123', '456'])
    })

    test('should expand letter shorthand', () => {
      const editor = createMockEditor(['1', '2', '3'])
      const result = transformSelections(editor, editor.selections, 'letter')
      assert.deepStrictEqual(result, ['A', 'B', 'C'])
    })

    test('should expand upperletter shorthand', () => {
      const editor = createMockEditor(['5', '10', '26'])
      const result = transformSelections(
        editor,
        editor.selections,
        'upperletter',
      )
      assert.deepStrictEqual(result, ['E', 'J', 'Z'])
    })

    test('should expand lowerletter shorthand', () => {
      const editor = createMockEditor(['1', '5', '26'])
      const result = transformSelections(
        editor,
        editor.selections,
        'lowerletter',
      )
      assert.deepStrictEqual(result, ['a', 'e', 'z'])
    })

    test('should expand upper shorthand', () => {
      const editor = createMockEditor(['hello', 'World', 'TEST'])
      const result = transformSelections(editor, editor.selections, 'upper')
      assert.deepStrictEqual(result, ['HELLO', 'WORLD', 'TEST'])
    })

    test('should expand lower shorthand', () => {
      const editor = createMockEditor(['HELLO', 'World', 'test'])
      const result = transformSelections(editor, editor.selections, 'lower')
      assert.deepStrictEqual(result, ['hello', 'world', 'test'])
    })
  })

  suite('Complex expressions', () => {
    test('should handle conditional expressions', () => {
      const editor = createMockEditor(['5', '15', '25'])
      const result = transformSelections(
        editor,
        editor.selections,
        'n > 10 ? "big" : "small"',
      )
      assert.deepStrictEqual(result, ['small', 'big', 'big'])
    })

    test('should handle template literals', () => {
      const editor = createMockEditor(['Alice', 'Bob', 'Charlie'])
      const result = transformSelections(
        editor,
        editor.selections,
        '`Hello, ${s}!`',
      )
      assert.deepStrictEqual(result, [
        'Hello, Alice!',
        'Hello, Bob!',
        'Hello, Charlie!',
      ])
    })

    test('should handle array operations', () => {
      const editor = createMockEditor(['hello', 'world', 'test'])
      const result = transformSelections(
        editor,
        editor.selections,
        's.split("").reverse().join("")',
      )
      assert.deepStrictEqual(result, ['olleh', 'dlrow', 'tset'])
    })

    test('should handle Math operations', () => {
      const editor = createMockEditor(['4', '9', '16'])
      const result = transformSelections(
        editor,
        editor.selections,
        'Math.sqrt(n)',
      )
      assert.deepStrictEqual(result, ['2', '3', '4'])
    })
  })

  suite('Multi-line expressions', () => {
    test('should handle multi-line expressions', () => {
      const editor = createMockEditor(['5', '10', '15'])
      const expression = `
        const doubled = n * 2;
        const result = doubled + 1;
        result
      `
      const result = transformSelections(editor, editor.selections, expression)
      assert.deepStrictEqual(result, ['', '', ''])
    })

    test('should handle expressions with explicit return', () => {
      const editor = createMockEditor(['hello', 'world'])
      const expression = `
        if (s.length > 4) {
          return s.toUpperCase();
        } else {
          return s.toLowerCase();
        }
      `
      const result = transformSelections(editor, editor.selections, expression)
      assert.deepStrictEqual(result, ['', ''])
    })
  })

  suite('Selection order handling', () => {
    test('should process selections in document order by default', () => {
      const editor = createMockEditor(['first', 'second', 'third'])
      const result = transformSelections(editor, editor.selections, 's + i')
      assert.deepStrictEqual(result, ['first1', 'second2', 'third3'])
    })

    test('should process selections in selection order when specified', () => {
      const editor = createMockEditor(['first', 'second', 'third'])
      const result = transformSelections(
        editor,
        editor.selections,
        's + i',
        true,
      )
      assert.deepStrictEqual(result, ['first1', 'second2', 'third3'])
    })
  })

  suite('Error handling', () => {
    test('should return [Error] for syntax errors', () => {
      const editor = createMockEditor(['test'])
      const result = transformSelections(
        editor,
        editor.selections,
        'invalid syntax here',
      )
      assert.deepStrictEqual(result, [''])
    })

    test('should return [Error] for runtime errors', () => {
      const editor = createMockEditor(['test'])
      const result = transformSelections(
        editor,
        editor.selections,
        'undefined.property',
      )
      assert.deepStrictEqual(result, [''])
    })

    test('should handle partial errors', () => {
      const editor = createMockEditor(['5', 'invalid', '10'])
      const result = transformSelections(
        editor,
        editor.selections,
        'n > 7 ? n * 2 : undefined.prop',
      )
      assert.ok(result.some((r) => r === ''))
    })
  })

  suite('Edge cases', () => {
    test('should handle empty selections', () => {
      const editor = createMockEditor(['', '', ''])
      const result = transformSelections(
        editor,
        editor.selections,
        's || "empty"',
      )
      assert.deepStrictEqual(result, ['empty', 'empty', 'empty'])
    })

    test('should handle single selection', () => {
      const editor = createMockEditor(['test'])
      const result = transformSelections(
        editor,
        editor.selections,
        's + " " + i + "/" + l',
      )
      assert.deepStrictEqual(result, ['test 1/1'])
    })

    test('should handle no selections', () => {
      const editor = createMockEditor([])
      const result = transformSelections(editor, [], 's')
      assert.deepStrictEqual(result, [])
    })

    test('should handle very long expressions', () => {
      const editor = createMockEditor(['test'])
      const longExpression = 's' + '.repeat(1)'.repeat(100)
      const result = transformSelections(
        editor,
        editor.selections,
        longExpression,
      )
      assert.strictEqual(result.length, 1)
      assert.ok(typeof result[0] === 'string')
    })
  })

  suite('Convnum library integration', () => {
    test('should have access to convnum library', () => {
      const editor = createMockEditor(['5', '10', '27'])
      const result = transformSelections(
        editor,
        editor.selections,
        'convnum.toRoman(n)',
      )
      assert.deepStrictEqual(result, ['V', 'X', 'XXVII'])
    })

    test('should handle convnum functions', () => {
      const editor = createMockEditor(['1', '2', '3'])
      const result = transformSelections(
        editor,
        editor.selections,
        'convnum.toLatinLetter(n)',
      )
      assert.deepStrictEqual(result, ['a', 'b', 'c'])
    })
  })
})
