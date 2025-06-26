import * as assert from 'assert'
import { TEXT } from '@/const/text'

suite('Path Aliases Test', () => {
  test('should be able to import from @/ alias', () => {
    assert.ok(TEXT)
  })
})
