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
    errors.push({ messageId: 'useLet' })
    count--
  }

  invalidCases.push({ code, errors })
}

pass('let x = 1')

pass('let x = 1, y = 2')

pass('for (let i = 1; i < 3; i++) console.log(i)')

fail(1, 'const x = 1')

fail(1, 'var x = 1')

fail(1, 'var x, y')

fail(1, 'for (const key in node) console.log(key)')

globalThis.describe('always-let',
                    () => ruleTester.run('always-let',
                                         plugins.cookshack.rules['always-let'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
