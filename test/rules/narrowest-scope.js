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
    errors.push({ messageId: 'tooBroad' })
    count--
  }
  invalidCases.push({ code, errors })
}

pass('function foo() { let x; x = 1; return x }')

pass('for (let i = 0; i < 10; i++) { console.log(i) }')

pass('function outer() { let x; function inner() { x = 1 } return x }')

pass('let x; function foo() { x = 1 } function bar() { return x }')

pass(`
function f(s1, s2, otherwise) {
  let a, s

  a = []
  s = s1
  while (s) {
    if (s.done)
      break
    a.push(s)
    s = s.next
  }
  s = s2
  while (s) {
    if (s.done)
      break
    if (a.includes(s))
      return s
    s = s.next
  }
  return otherwise
}
`)

pass('import { a } from \'a.js\'; { a.f() }')

pass('function foo() { return 1 } function bar() { return foo() }')

// requires var usage analysis
//
pass(`
let tout

function update
(view) {
  if (tout)
    clearTimeout(tout)
  tout = setTimeout(() => console.log('hi'), 10000)
}
`)

// requires var usage analysis
//
pass(`
function init
() {
  let tout

  function update
  (view) {
    if (tout)
      clearTimeout(tout)
    tout = setTimeout(() => console.log('hi'), 10000)
  }
}
`)

pass('try { f() } catch (err) { console.log(err.message) }')

fail(1, 'let x = 1; function foo() { return x }')

fail(1, 'let x; { let y = 1; x = y }')

fail(2, `
function f
(a, b, otherwise) {
  let c1, c2, ok

  if (a)
    ok = 4
  else
    ok = 1

  if (b) {
    b.forEach(d => {
      c1 = c1 || ok
      c1 += d
    })
    return c1
  }

  {
    c2 = ok
    c2 += ok * ok
    if (c2 > 22)
      return ok
  }

  return otherwise
}
`)

globalThis.describe('narrowest-scope',
                    () => ruleTester.run('narrowest-scope',
                                         plugins.cookshack.rules['narrowest-scope'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
