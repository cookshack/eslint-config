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
    errors.push({ messageId: 'declBlockStart' })
    count--
  }

  invalidCases.push({ code, errors })
}

pass('function f() { let x; function g() {} }')

pass('{ function f() {} }')

pass('{ let x; function f() {} }')

pass('{ let x; let y; function f() {}; function g() {} }')

pass('{ function f() {}; function g() {}; code() }')

fail(1, 'function main1 () { let a; a = 0; let b }')

fail(2, 'function main2 () { let a; a = 0; function f() { return 1 } let b }')

fail(1, 'function f() { function g() {}; let x }')

fail(1, '{ x; function f() {} }')

fail(1, '{ let x; code(); function f() {} }')

fail(1, '{ function f() {}; let x }')

fail(2, '{ function f() {}; let x; let y }')

fail(1, '{ function f() {}; function g() {}; let x }')

globalThis.describe('fn-decl-block-start',
                    () => ruleTester.run('fn-decl-block-start',
                                         plugins.cookshack.rules['fn-decl-block-start'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
