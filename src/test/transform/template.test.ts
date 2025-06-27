import * as assert from 'assert'
import { generateTemplate } from '@/transform/template'

suite('generateTemplate Function Tests', () => {
  suite('Basic template generation', () => {
    test('should generate template with selection count', () => {
      const result = generateTemplate(3)
      assert.ok(result.includes('3 selection(s)'))
      assert.ok(result.includes('/// <reference path='))
      assert.ok(result.includes('Available variables: s, n, i, i0, l, ss'))
      assert.ok(result.includes('ADVANCED TRANSFORM EXPRESSION'))
    })

    test('should generate template with first selection text', () => {
      const result = generateTemplate(2, 'hello')
      assert.ok(result.includes('"hello"'))
      assert.ok(result.includes('2 selection(s)'))
    })

    test('should handle missing first selection text', () => {
      const result = generateTemplate(1)
      assert.ok(result.includes('"hello"')) // default fallback
      assert.ok(result.includes('1 selection(s)'))
    })

    test('should handle empty first selection text', () => {
      const result = generateTemplate(5, '')
      assert.ok(result.includes('"hello"')) // fallback for empty string
      assert.ok(result.includes('5 selection(s)'))
    })
  })

  suite('Template content validation', () => {
    test('should include TypeScript reference path', () => {
      const result = generateTemplate(1)
      assert.ok(result.startsWith('/// <reference path='))
      assert.ok(result.includes('transform.d.ts'))
    })

    test('should include header section', () => {
      const result = generateTemplate(1)
      assert.ok(result.includes('ADVANCED TRANSFORM EXPRESSION'))
      assert.ok(result.includes('This expression will be evaluated'))
    })

    test('should include variable documentation', () => {
      const result = generateTemplate(1)
      assert.ok(result.includes('Available variables: s, n, i, i0, l, ss'))
      assert.ok(result.includes('Available functions: number(), letter()'))
      assert.ok(result.includes('Convnum library: convnum.toRoman()'))
    })

    test('should include example expressions', () => {
      const result = generateTemplate(1)
      assert.ok(result.includes('EXAMPLE EXPRESSIONS'))
      assert.ok(result.includes('n * 3'))
      assert.ok(result.includes('upper(s)'))
      assert.ok(result.includes('letter(n)'))
      assert.ok(result.includes('convnum.toRoman(n)'))
    })

    test('should include user expression section', () => {
      const result = generateTemplate(1)
      assert.ok(result.includes('YOUR EXPRESSION GOES HERE'))
      assert.ok(result.includes('Write your JavaScript expression below'))
    })

    test('should include placeholder at the end', () => {
      const result = generateTemplate(1)
      assert.ok(result.endsWith('s'))
    })
  })

  suite('Selection count variations', () => {
    test('should handle single selection', () => {
      const result = generateTemplate(1, 'test')
      assert.ok(result.includes('1 selection(s)'))
      assert.ok(result.includes('"test"'))
    })

    test('should handle multiple selections', () => {
      const result = generateTemplate(10, 'example')
      assert.ok(result.includes('10 selection(s)'))
      assert.ok(result.includes('"example"'))
    })

    test('should handle large selection count', () => {
      const result = generateTemplate(1000, 'data')
      assert.ok(result.includes('1000 selection(s)'))
      assert.ok(result.includes('"data"'))
    })

    test('should handle zero selections', () => {
      const result = generateTemplate(0)
      assert.ok(result.includes('0 selection(s)'))
      assert.ok(result.includes('"hello"')) // fallback
    })
  })

  suite('First selection text handling', () => {
    test('should escape quotes in first selection', () => {
      const result = generateTemplate(1, 'text with "quotes"')
      assert.ok(result.includes('"text with "quotes""'))
    })

    test('should handle special characters', () => {
      const result = generateTemplate(1, 'special chars: @#$%^&*()')
      assert.ok(result.includes('"special chars: @#$%^&*()"'))
    })

    test('should handle newlines in selection', () => {
      const result = generateTemplate(1, 'line1\nline2')
      assert.ok(result.includes('"line1\nline2"'))
    })

    test('should handle unicode characters', () => {
      const result = generateTemplate(1, 'café naïve résumé')
      assert.ok(result.includes('"café naïve résumé"'))
    })

    test('should handle very long selection text', () => {
      const longText = 'a'.repeat(1000)
      const result = generateTemplate(1, longText)
      assert.ok(result.includes(`"${longText}"`))
    })
  })

  suite('Path handling', () => {
    test('should escape backslashes in Windows paths', () => {
      const result = generateTemplate(1)
      // Check that the path is properly escaped for Windows
      const refMatch = result.match(/\/\/\/ <reference path="([^"]+)"/)
      assert.ok(refMatch)
      const path = refMatch[1]
      // Should contain escaped backslashes if on Windows-style paths
      if (path.includes('\\\\')) {
        assert.ok(path.includes('\\\\'))
      }
    })

    test('should include correct relative path', () => {
      const result = generateTemplate(1)
      assert.ok(result.includes('transform.d.ts'))
    })
  })

  suite('Template structure validation', () => {
    test('should have proper comment structure', () => {
      const result = generateTemplate(1)
      const lines = result.split('\n')

      // Should start with reference
      assert.ok(lines[0].startsWith('/// <reference'))

      // Should have proper comment blocks
      assert.ok(
        lines.some((line) =>
          line.includes('═══════════════════════════════════════════'),
        ),
      )
    })

    test('should include all required sections', () => {
      const result = generateTemplate(1)

      const requiredSections = [
        'ADVANCED TRANSFORM EXPRESSION',
        'EXAMPLE EXPRESSIONS',
        'YOUR EXPRESSION GOES HERE',
      ]

      requiredSections.forEach((section) => {
        assert.ok(result.includes(section), `Missing section: ${section}`)
      })
    })

    test('should include variable documentation', () => {
      const result = generateTemplate(1)

      const variableDocs = [
        'li0, li, fli0, fli, wl, len, cc, wc',
        'number(), letter()',
        'upperletter(), lowerletter(), upper()',
        'convnum.toRoman()',
        'convnum.toLatinLetter()',
        'convnum.toEnglishWords()',
      ]

      variableDocs.forEach((doc) => {
        assert.ok(result.includes(doc), `Missing documentation: ${doc}`)
      })
    })

    test('should include comprehensive examples', () => {
      const result = generateTemplate(1)

      const examples = [
        'n * 3',
        'upper(s)',
        'letter(n)',
        's + "_" + i',
        'n ? n * 2 : s',
        's.length > 5 ? upper(s) : lower(s)',
        'convnum.toRoman(n)',
        'Math.pow(n || 1, 2)',
      ]

      examples.forEach((example) => {
        assert.ok(result.includes(example), `Missing example: ${example}`)
      })
    })
  })

  suite('Edge cases and error handling', () => {
    test('should handle negative selection count', () => {
      const result = generateTemplate(-1)
      assert.ok(result.includes('-1 selection(s)'))
    })

    test('should handle null first selection', () => {
      const result = generateTemplate(1, null as any)
      assert.ok(result.includes('"hello"')) // fallback
    })

    test('should handle undefined first selection', () => {
      const result = generateTemplate(1, undefined)
      assert.ok(result.includes('"hello"')) // fallback
    })

    test('should be a valid string without syntax errors', () => {
      const result = generateTemplate(5, 'test')
      assert.ok(typeof result === 'string')
      assert.ok(result.length > 0)

      // Should not have obvious syntax issues
      assert.ok(!result.includes('undefined'))
      assert.ok(!result.includes('null'))
    })
  })
})
