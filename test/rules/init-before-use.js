import { RuleTester } from 'eslint'
import { plugins } from '../../index.js'

let ruleTester, validCases, invalidCases

ruleTester = new RuleTester()
validCases = []
invalidCases = []

function fail(message, code) {
  invalidCases.push({ code, errors: [ { messageId: message } ] })
}

function pass(code) {
  validCases.push({ code })
}

pass('let x = 1; x')

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
