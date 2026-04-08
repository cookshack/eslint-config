import { RuleTester } from 'eslint'
import { plugins } from '../../index.js'

let ruleTester, validCases, invalidCases

ruleTester = new RuleTester()
validCases = []
invalidCases = []

function pass
(code) {
  validCases.push({ code })
}

function fail
(count, code) {
  let errors

  errors = []
  while (count > 0) {
    errors.push({ messageId: 'risky' })
    count--
  }

  invalidCases.push({ code, errors })
}

pass('if (x == y) { }')

pass('if (x != y) { }')

pass('if (x !== y) { }')

fail(1, 'if (x === y) { }')

fail(2, 'if (x === y || a === y || a > 4) { }')

globalThis.describe('use-risky-equal',
                    () => ruleTester.run('use-risky-equal',
                                         plugins.cookshack.rules['use-risky-equal'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
