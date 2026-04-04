import { RuleTester } from 'eslint'
import { plugins } from '../../index.js'

let long1, long2, ruleTester

ruleTester = new RuleTester()

// this is too hard to detect (needs data flow analysis)
long1 = `
function f
(a, b, otherwise) {
  let c1, ok

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
    c1 = ok
    c1 += ok * ok
    if (c1 > 22)
      return ok
  }

  return otherwise
}
`

long2 = `
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
`

describe('narrowest-scope',
         () => {
           ruleTester.run('narrowest-scope',
                          plugins.cookshack.rules['narrowest-scope'],
                          { valid: [ { code: 'function foo() { let x; x = 1; return x }' },
                                     { code: 'for (let i = 0; i < 10; i++) { console.log(i) }' },
                                     { code: 'function outer() { let x; function inner() { x = 1 } return x }' },
                                     { code: 'let x; function foo() { x = 1 } function bar() { return x }' },
                                     // laxer on functions for now
                                     { code: 'function foo() { return 1 } function bar() { return foo() }' } ],
                            invalid: [ { code: 'let x = 1; function foo() { return x }',
                                         errors: [ { messageId: 'tooBroad' } ] },
                                       { code: 'let x; { let y = 1; x = y }',
                                         errors: [ { messageId: 'tooBroad' } ] },
                                        ...(0
                                            ? [ { code: long1,
                                                  errors: [ { messageId: 'tooBroad' } ] } ]
                                            : []),
                                       { code: long2,
                                         errors: [ { messageId: 'tooBroad' },
                                                   { messageId: 'tooBroad' } ] } ] })
         })
