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

// VariableDeclaration

pass('let x = 1')

pass('var x = 1')

pass('const x = 1')

pass('{ let x = 1 }')

pass('{ var x = 1 }')

pass('{ const x = 1 }')

pass('{ let x = 1; let y = 2 }')

pass('{ let x, y }')

pass('{ let x; let y }')

pass('for (let i = 0; i < 10; i++) { }')

pass('for (var i = 0; i < 10; i++) { }')

pass('for (const i = 0; i < 10; i++) { }')

pass('for (let x of arr) { }')

pass('for (let x in obj) { }')

pass('for (var x in obj) { }')

pass('try { } catch (err) { }')

pass('function f() { let x }')

pass('function f() { var x }')

pass('function f() { const x = 1 }')

pass('{ { let x } }')

pass('{ { let x; let y } }')

fail(1, 'if (1) { x = 1; let y = 2 }')

fail(1, 'if (1) { x = 1; var y = 2 }')

fail(1, 'if (1) { x = 1; const y = 2 }')

fail(2, 'if (1) { x = 1; let y = 2; let z = 3 }')

fail(1, '{ x = 1; let y = 2 }')

fail(1, '{ x = 1; var y = 2 }')

fail(1, '{ x = 1; const y = 2 }')

fail(1, 'function f() { x = 1; let y = 2 }')

fail(1, 'function f() { x = 1; var y = 2 }')

fail(1, 'function f() { x = 1; const y = 2 }')

fail(1, '{ { x = 1; let y = 2 } }')

fail(1, 'if (1) { if (2) { x = 1; let y = 2 } }')

fail(1, 'while (1) { x = 1; let y = 2 }')

fail(1, 'for (let i = 0; i < 10; i++) { x = 1; let y = 2 }')

// FunctionDeclaration

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

globalThis.describe('var-decl-block-start',
                    () => ruleTester.run('var-decl-block-start',
                                         plugins.cookshack.rules['var-decl-block-start'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
