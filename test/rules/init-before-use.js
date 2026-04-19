import { Linter } from 'eslint'
import { plugins } from '../../index.js'
import { lastOst, ostString } from '../../plugins/init-before-use.js'

let linter, validCases, invalidCases, config

linter = new Linter()
validCases = []
invalidCases = []

config = [ { languageOptions: { ecmaVersion: 2025,
                                sourceType: 'module' },
             plugins,
             rules: { 'cookshack/init-before-use': 'error' } } ]

function tree
() {
  let out

  out = ostString(lastOst())
  if (out.length)
    return '=== Ordered Syntax Tree ===\n' + out
  return ''
}

function _pass(tc) {
  let messages

  messages = linter.verify(tc.code, config)
  if (messages.length > 0)
    throw new Error('unexpected errors: ' + JSON.stringify(messages, null, 2) + '\n' + tree())
}

function _fail(tc) {
  let messages

  messages = linter.verify(tc.code, config)
  if (messages.length == tc.errors.length)
    return
  throw new Error('expected ' + tc.errors.length + ' errors, got ' + messages.length + '\n' + JSON.stringify(messages, null, 2) + '\n' + tree())
}

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

pass('let x; x = 1')

pass('let x = 1; x')

pass('function f() { let x = 1; return x }')

pass('let x; function shadow() { let x = 2; return x } function shadow2() { let x = 3; return x } x = 1')

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

pass('let x = 1; --x')

pass('let x = 1; x++')

pass('let x = 1; x += 2')

pass("import globals from 'globals'")

pass('let x, y; y = () => { return x }; x = 1')

// it's actually an err, but we'd have to track assignments
pass('let x, y; y = () => { return x }; y(); x = 1')

pass('let i; for (i = addr; i < end; i++) {}')

pass('for (let i = 0; i < 16; i++) { }')

pass(`
  for (let count = 0, i = 0; i < Ed.ctags.length; i++)
    if (Ed.ctags[i].name.startsWith(word.text)) {
      options.push({ label: Ed.ctags[i].name, type: Ed.ctags[i].kind })
      if (count++ > 10)
        break
    }
`)

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

fail('initBeforeUse', 'let x; x = f(x)')

fail('initBeforeUse', 'let x = 0; function shadow(y) { let x; x = shadow2(x) + y; return x } function shadow2(y) { let x = 3 + y; return x } shadow(x)')

fail('initBeforeUse', 'let x; --x')

fail('initBeforeUse', 'let x; x++')

fail('initBeforeUse', 'let x; x += 2')

globalThis.describe('init-before-use', () => {
  for (let tc of validCases)
    globalThis.it(tc.code, () => _pass(tc))
  for (let tc of invalidCases)
    globalThis.it(tc.code, () => _fail(tc))
})
