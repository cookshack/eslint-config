import { RuleTester } from 'eslint'
import { Linter } from 'eslint'

let ruleTester, validCases, invalidCases, rule

rule = new Linter({ configType: 'eslintrc' }).getRules().get('no-shadow')
ruleTester = new RuleTester()
validCases = []
invalidCases = []

function pass
(code) {
  validCases.push({ code })
}

function fail
(code) {
  invalidCases.push({ code, errors: [ { messageId: 'noShadow' } ] })
}

pass('var a = 3; function b() { var c = 10; }')
pass('let x = 1; { let y = 2; }')
pass('function a() { let x = 1 } function b() { let x = 2 }')
pass('var a = 1; if (x) { var a = 2; }')

fail('var a = 3; function b() { var a = 10; }')
fail('let x = 1; { let x = 2; }')
fail('let a = 1; function foo(a) { return a }')
fail('function f(x) { function g() { let x = 2; } }')
fail('const a = 1; function foo() { const a = 2; }')
fail('let a = 1; if (x) { let a = 2; }')

globalThis.describe('no-shadow',
                    () => ruleTester.run('no-shadow',
                                         rule,
                                         { valid: validCases,
                                           invalid: invalidCases }))
