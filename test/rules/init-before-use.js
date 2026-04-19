import { RuleTester } from 'eslint'
import { plugins } from '../../index.js'

let ruleTester, validCases, invalidCases

ruleTester = new RuleTester()
validCases = []
invalidCases = []

function fail(message, code) {
  let errors

  if (Array.isArray(message))
    errors = message.map(m => ({ messageId: m }))
  else
    errors = [ { messageId: message } ]
  invalidCases.push({ code, errors })
}

function pass(code) {
  validCases.push({ code })
}

pass('let x; function shadow() { let x = 2; return x } function shadow2() { let x = 3; return x } x = 1')

pass('let x; x = 1')

pass('let x = 1; x')

pass('function f() { let x = 1; return x }')

pass('for (let x in [1,2,3]) {}; let x = 1')

pass(`for (let tc of validCases)
    globalThis.it(tc.code, () => _valid(tc))
`)

pass(`for (let tc of validCases)
    globalThis.it(tc.code, () => _valid(tc))
  for (let tc of invalidCases)
    globalThis.it(tc.code, () => _invalid(tc))
`)

pass('let x; let y = { x: 1 }; x = 2')

pass('function x() { }')

pass(`function a1
() {
  let p

  function a2
  () {
    return p[p.length - 1]
  }

  p = []
  return a2(0)
}`)

fail('mustInit', 'let x')

fail('initBeforeUse', 'x; let x = 1')

fail('initBeforeUse', 'f(); let f = () => {}')

fail('mustInit', 'console.log(x); let x')

fail([ 'initBeforeUse', 'initBeforeUse' ], 'x; y; let x = 1; let y = 2')

fail('initBeforeUse', 'for (x in [1,2,3]) {}; let x = 1')

fail('mustInit', 'for (x in [1,2,3]) {}; let x')

fail('initBeforeUse', 'let x = f(); function f() { return x }')

fail('initBeforeUse', `function outer
(arg) {
  let p

  function inner
  () {
    p.focus()
  }

  if (arg) {
    inner()
    return
  }

  p = get()
  inner()
}`)

globalThis.describe('init-before-use',
                    () => ruleTester.run('init-before-use',
                                         plugins.cookshack.rules['init-before-use'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
