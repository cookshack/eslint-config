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
    errors.push({ messageId: 'fnArgsNl' })
    count--
  }
  invalidCases.push({ code, errors })
}

pass(`function f
(arg) {
}`)

pass(`function f
() {}`)

pass(`function f
(arg1, arg2) {}`)

pass(`function f
(
  arg
) {}`)

pass(`export default
function
() {
  return 1
}
`)

pass(`
function f
() {
  return { f1
           () {
             return 1
           } }
}
`)

pass(`
function f
() {
  return {
    f1
    () {
      return 1
    }
  }
}
`)

pass(`
  class Marker {
    constructor
    (name, num) {
    }
    toDOM
    () {
    }
  }
`)

fail(1, 'function f (arg) {}')

fail(1, 'function f() {}')

fail(1, `function f (arg,
                     arg2) {
}`)

fail(1, `function f

(arg) {}`)

fail(1, `function f


(arg) {}`)

globalThis.describe('fn-args-nl',
                    () => ruleTester.run('fn-args-nl',
                                         plugins.cookshack.rules['fn-args-nl'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
