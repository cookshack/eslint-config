import { Linter } from 'eslint'
import { plugins, rules, languageOptions } from '../../index.js'
import assert from 'node:assert'

let linter, config, passCases, failCases

linter = new Linter()
config = [ { languageOptions, plugins, rules } ]
passCases = []
failCases = []

function indentCount
(code) {
  return linter.verify(code, config).filter(m => m.ruleId == 'indent').length
}

function pass
(code) {
  passCases.push({ code })
}

function fail
(count, code) {
  failCases.push({ count, code })
}

function _pass
(tc) {
  assert.strictEqual(indentCount(tc.code), 0)
}

function _fail
(tc) {
  assert.strictEqual(indentCount(tc.code), tc.count)
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
function f
(x,
 y) {
  return x + y
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
items.map((x ,y) => {
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

pass(`
function f
(x) {
  if (x)
    use(x)
  else
    drop(x)
}`)

pass(`
run(arg, () => {
           let x
           if (x)
             use(x)
           else
             drop(x)
         })`)

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

fail(4, `
let handler

handler = arg => {
            let decoder

    function decode
    (str) {
      return decoder.decode(str)
    }
            decoder = new TextDecoder()

            decode(arg)
          }

handler()
`)

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

fail(5, `
function f
(x) {
    if (x)
      use(x)
    else
      drop(x)
  }`)

fail(6, `
run(arg, () => {
    let x
    if (x)
      use(x)
    else
      drop(x)
  })`)

fail(1, `
run(() => {
      let x
      if (x)
        use(x)
        else
        drop(x)
    })`)

fail(1, `
run(function
    (abc) {
      if (abc)
        use(abc)
        else
        drop(abc)
    })`)

fail(1, `
if (items)
  console.log(1)
  else // the warning here is present in bred
  console.log(2)`)

fail(1, `
console.log(globalThis.eg(function
                          (abc) {
                            if (abc)
                              console.log(1)
                              else // the warning here is missing in bred
                              console.log(2)
                          }))`)

globalThis.describe('indent',
                    () => {
                      for (let tc of passCases)
                        globalThis.it(tc.code,
                                      () => _pass(tc))
                      for (let tc of failCases)
                        globalThis.it(tc.code,
                                      () => _fail(tc))
                    })
