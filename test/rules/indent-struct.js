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

  if (code == undefined) {
    code = count
    count = 1
  }
  errors = []
  while (count > 0) {
    errors.push({ messageId: 'indentStruct' })
    count--
  }
  invalidCases.push({ code, errors })
}

pass('let x = { a: 1, b: 2 }')

pass(`
let x = {
          a: 1,
          b: 2
        }`)

pass(`
let x = { a: 1,
          b: 2 }`)

pass(`
let x = {
          a
          () {}
        }`)

pass(`
let x = {
          a
          () {},
          b
          () {}
        }`)

pass(`
function f
() {
  return { a: 1,
           b: 2 }
}`)

pass(`
function f1
() {
  return { f1
           () {
             return 1
           },
           b: 2 }
}`)

pass(`
function f2
() {
  return { a: 1,
           f2
           () {
             return 2
           } }
}`)

pass(`
let x = { a: 1,
          b: 2 }  
`)

pass(`
let x = { a: 1,
          b: 2 } /*stuff  {, } */
`)

pass(`
let x = { a: 1,
          b: 2 }   /*stuff*/
`)

pass(`
let x = { a: { a: 1,
               b: 2 } }
`)

pass(`
let x = { a: { a: 1,
               b: 2 } }   ; function f(){ return 1}
`)

pass(`function create
(context) {
  return { VariableDeclaration
           (node) {
             if (node.kind == 'const' || node.kind == 'var')
               context.report({ node, messageId: 'useLet' })
           } }
}`)

pass(`function two
() {
  return { 'Program:exit'
           () {
             // do
           } }
}`)

fail(2, `
let x = {
  a: 1,
  b: 2
}`)

fail(1, `
let x = {
          a: 1,
           b: 2
        }`)

fail(1, `
let x = { a: 1,
         b: 2 }`)

fail(1, `
let x = { a: 1,
  b: 2 }`)

fail(1, `
let x = { a: 1,
b: 2 }`)

fail(2, `
let x = { a: 1,
  b: 2,
  c: 3 }`)

fail(1, `
let aHasArgsOnNextLine = { a
  () {} }`)

fail(1, `
let x = { a: 1,
          b: 2}
`)

fail(1, `
let x = { a: 1,
          b: 2  }
`)

fail(1, `
let x = { a: { a: 1,
               b: 2  } }
`)

globalThis.describe('indent-struct',
                    () => ruleTester.run('indent-struct',
                                         plugins.cookshack.rules['indent-struct'],
                                         { valid: validCases,
                                           invalid: invalidCases }))
