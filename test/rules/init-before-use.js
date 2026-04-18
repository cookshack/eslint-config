import { RuleTester } from 'eslint'
import { plugins } from '../../index.js'

let ruleTester, validCases, invalidCases

ruleTester = new RuleTester()
validCases = []
invalidCases = []

function pass(code) {
  validCases.push({ code })
}

function fail(count, code) {
  let errors

  errors = []
  while (count > 0) {
    errors.push({ messageId: 'initBeforeUse' })
    count--
  }

  invalidCases.push({ code, errors })
}

pass('let x = 1; x')

pass('let x; x = 1')

pass('var x = 1; x')

pass('function f() { let x = 1; return x }')

pass('let x = f(); function f() { return x }')

pass(`for (let tc of validCases)
    globalThis.it(tc.code, () => _valid(tc))
`)

pass(`for (let tc of validCases)
    globalThis.it(tc.code, () => _valid(tc))
  for (let tc of invalidCases)
    globalThis.it(tc.code, () => _invalid(tc))
`)

fail(1, 'x; let x = 1')

fail(1, 'f(); let f = () => {}')

fail(1, 'x; const x = 1')

fail(1, 'console.log(x); let x')

fail(2, 'x; y; let x = 1; let y = 2')

fail(1, 'for (x in [1,2,3]) {}; let x')

globalThis.describe('init-before-use',
                    () => ruleTester.run('init-before-use',
                                         plugins.cookshack.rules['init-before-use'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
