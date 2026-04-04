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
(messageId, code) {
  invalidCases.push({ code, errors: [ { messageId } ] })
}

pass('if (x) { }')

fail('positiveVibes', 'if (!x) { }')

fail('equality', 'if (x != y) { }')

fail('strictEquality', 'if (x !== y) { }')

fail('equality', 'function f(x, y) { return x != y }')

globalThis.describe('positive-vibes',
                    () => ruleTester.run('positive-vibes',
                                         plugins.cookshack.rules['positive-vibes'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
