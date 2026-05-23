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
    errors.push({ messageId: 'indentFnBlock' })
    count--
  }

  invalidCases.push({ code, errors })
}

pass('function f() {}')

pass(`
function f
(x) {
  return x
}`)

pass(`
async function f
(x) {
  return x
}`)

pass(`
let f = function
        (x) {
          return x
        }`)

pass(`
let f = function whats
        (x) {
          return x
        }`)

pass(`
let f = (x) => {
          return x
        }`)

pass(`
items.map(x => {
            return x
          })`)

pass(`
let obj = { method
            (x) {
              return x
            } }`)

pass(`
let obj = { get x
                () {
                  return 1
                } }`)

pass(`
function outer
(x) {
  function inner
  (y) {
    return y
  }
}`)

pass(`
function f
(x) {
}`)

pass('let f = x => x + 1')

fail(1, `
function f
(x) {
   return x
}`)

fail(1, `
function f
(x) {
  return x
  }`)

fail(2, `
function f
(x) {
   return x
  }`)

fail(1, `
let f = function
        (x) {
           return x
        }`)

fail(1, `
items.map(x => {
            return x
         })`)

fail(1, `
items.map(x => {
          return x
          })`)

fail(1, `
let obj = {
           method
           (x) {
            return x
           }
         }`)

fail(1, `
let obj = {
           method
           (x) {
             return x
          }
         }`)

globalThis.describe('indent-fn-block',
                    () => ruleTester.run('indent-fn-block',
                                         plugins.cookshack.rules['indent-fn-block'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
