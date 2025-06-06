import * as assert from 'assert'
import { TYPE_PRIORITY } from '@/const/const'

suite('Path Aliases Test', () => {
  test('should be able to import from @/ alias', () => {
    assert.ok(Array.isArray(TYPE_PRIORITY))
    assert.ok(TYPE_PRIORITY.length > 0)
    assert.strictEqual(typeof TYPE_PRIORITY[0], 'string')
  })
})
