import { Linter } from 'eslint'
import { plugins } from '../../index.js'
import { getPrintBuffer } from '../../plugins/narrowest-scope.js'
import { diffLines } from 'diff'

let linter, validCases, invalidCases, config

linter = new Linter()
validCases = []
invalidCases = []

config = [ { languageOptions: { ecmaVersion: 2025,
                                sourceType: 'module' },
             plugins,
             rules: { 'cookshack/narrowest-scope': 'error' } } ]

function pass(code, expected) {
  validCases.push({ code, expected })
}

function patch(expected, output) {
  return diffLines(expected.trim(), output.trim()).flatMap(p => p.value.split('\n').filter(l => l).map(l => ({ ...p, line: l })))
    .map(p => (p.removed ? '- ' : p.added ? '+ ' : '  ') + p.line).join('\n')
}

function _pass(tc) {
  let messages, output

  messages = linter.verify(tc.code, config)
  output = getPrintBuffer()
  if (messages.length > 0)
    throw new Error('unexpected errors: ' + JSON.stringify(messages) + '\noutput:\n' + output)
  if (tc.expected?.trim() == output.trim())
    return
  throw new Error('output mismatch:\n' + patch(tc.expected, output))
}

function _fail(tc) {
  let messages, output

  messages = linter.verify(tc.code, config)
  output = getPrintBuffer()
  if (messages.length == tc.errors.length) {
    if (tc.expected?.trim() == output.trim())
      return
    throw new Error('output mismatch:\n' + patch(tc.expected, output))
  }
  throw new Error('expected ' + tc.errors.length + ' errors, got ' + messages.length + '\n' + JSON.stringify(messages, null, 2))
}

function fail(count, code, expected) {
  let errors

  errors = []
  while (count > 0) {
    errors.push({ messageId: 'tooBroad' })
    count--
  }
  invalidCases.push({ code, errors, expected })
}

pass('if (g) { let x = 0; x++; console.log(x); }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    SCOPE 1.1.1 BLOCK pos 7
      LET   x     pos 13
      WRITE x     pos 13.4
      READ  x     pos 20
      WRITE x     pos 20
      READ  x     pos 37`)

pass('let x = 0; x++; console.log(x);',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   x     pos 4
    WRITE x     pos 4.4
    READ  x     pos 11
    WRITE x     pos 11
    READ  x     pos 28`)

pass('{ let x = 0; if (x) console.log(1); }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    SCOPE 1.1.1 BLOCK pos 0
      LET   x     pos 6
      WRITE x     pos 6.4
      READ  x     pos 17`)

pass('let x = 0; x++; let y = x; console.log(y);',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   x     pos 4
    WRITE x     pos 4.4
    READ  x     pos 11
    WRITE x     pos 11
    READ  x     pos 19.6
    LET   y     pos 20
    WRITE y     pos 20.4
    READ  y     pos 39`)

pass('let x = 0; x++; let y = x + 1; console.log(y);',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   x     pos 4
    WRITE x     pos 4.4
    READ  x     pos 11
    WRITE x     pos 11
    READ  x     pos 19.6
    LET   y     pos 20
    WRITE y     pos 20.4
    READ  y     pos 43`)

pass('function foo() { let x; x = 1; return x }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   foo     pos 9
    SCOPE 1.1.1 FUNCTION pos 12 name foo
      LET   x     pos 21
      WRITE x     pos 29.4
      READ  x     pos 38`)

pass('for (let i = 0; i < 10; i++) { console.log(i) }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    SCOPE 1.1.1 FOR pos 0
      LET   i     pos 9
      WRITE i     pos 9.4
      READ  i     pos 16
      READ  i     pos 24
      WRITE i     pos 24
      SCOPE 1.1.1.1 BLOCK pos 29
        READ  i   C pos 43`)

pass('function outer() { let x; function inner() { x = 1 } return x }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   outer     pos 9
    SCOPE 1.1.1 FUNCTION pos 14 name outer
      LET   x     pos 23
      LET   inner     pos 35
      SCOPE 1.1.1.1 FUNCTION pos 40 name inner
        WRITE x     pos 50.4
      READ  x     pos 60`)

pass('let x; function foo() { x = 1 } function bar() { return x }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   x     pos 4
    LET   foo     pos 16
    SCOPE 1.1.1 FUNCTION pos 19 name foo
      WRITE x     pos 29.4
    LET   bar     pos 41
    SCOPE 1.1.2 FUNCTION pos 44 name bar
      READ  x     pos 56`)

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
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   f     pos 10
    SCOPE 1.1.1 FUNCTION pos 11 name f
      LET   s1     pos 12
      LET   s2     pos 16
      LET   otherwise     pos 20
      LET   a     pos 39
      LET   s     pos 42
      WRITE a     pos 53.4
      READ  s1     pos 60
      WRITE s     pos 62.4
      READ  s     pos 72
      SCOPE 1.1.1.1 BLOCK pos 75
        READ  s   C pos 85
        READ  a   C pos 109
        READ  s   C pos 116
        READ  s   C pos 127
        WRITE s   C pos 133.4
      READ  s2     pos 144
      WRITE s     pos 146.4
      READ  s     pos 156
      SCOPE 1.1.1.2 BLOCK pos 159
        READ  s   C pos 169
        READ  a   C pos 197
        READ  s   C pos 208
        READ  s B C pos 225
        READ  s   C pos 235
        WRITE s   C pos 241.4
      READ  otherwise     pos 255`)

pass('import { a } from \'a.js\'; { a.f() }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   a     pos 9
    SCOPE 1.1.1 BLOCK pos 26
      READ  a     pos 28`)

pass('function foo() { return 1 } function bar() { return foo() }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   foo     pos 9
    SCOPE 1.1.1 FUNCTION pos 12 name foo
    LET   bar     pos 37
    SCOPE 1.1.2 FUNCTION pos 40 name bar
      READ  foo     pos 52`)

pass(`
let tout

function update
(view) {
  if (tout)
    clearTimeout(tout)
  tout = setTimeout(() => console.log('hi'), 10000)
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   tout     pos 5
    LET   update     pos 20
    SCOPE 1.1.1 FUNCTION pos 26 name update
      LET   view     pos 28
      READ  tout     pos 42
      READ  tout B C pos 65
      SCOPE 1.1.1.1 FUNCTION pos 91
      WRITE tout     pos 122.4`)

pass(`
function init
() {
  let out2

  function update
  (view) {
    if (out2)
      clearTimeout(out2)
    out2 = setTimeout(() => console.log('hi'), 10000)
  }
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   init     pos 10
    SCOPE 1.1.1 FUNCTION pos 14 name init
      LET   out2     pos 26
      LET   update     pos 43
      SCOPE 1.1.1.1 FUNCTION pos 49 name update
        LET   view     pos 53
        READ  out2     pos 69
        READ  out2 B C pos 94
        SCOPE 1.1.1.1.1 FUNCTION pos 122
        WRITE out2     pos 153.4`)

pass(`
function init
() {
  let stopTimeout

  function f() {
    if (stopTimeout) {
      clearTimeout(stopTimeout)
      stopTimeout = 0
    }
    else {
      console.log('Again to stop')
      stopTimeout = setTimeout(() => {
        stopTimeout = 0
        console.log('stop timed out')
      }, 5000)
    }
  }

  return f
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   init     pos 10
    SCOPE 1.1.1 FUNCTION pos 14 name init
      LET   stopTimeout     pos 26
      LET   f     pos 50
      SCOPE 1.1.1.1 FUNCTION pos 51 name f
        READ  stopTimeout     pos 64
        SCOPE 1.1.1.1.1 BLOCK pos 77
          READ  stopTimeout   C pos 98
          WRITE stopTimeout   C pos 132.4
        SCOPE 1.1.1.1.2 BLOCK pos 148
          SCOPE 1.1.1.1.2.1 FUNCTION pos 216
            WRITE stopTimeout   C pos 247.4
          WRITE stopTimeout   C pos 300.4
      READ  f     pos 321`)

pass('try { f() } catch (err) { console.log(err.message) }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    SCOPE 1.1.1 BLOCK pos 4
    SCOPE 1.1.2 CATCH pos 12
      LET   err     pos 19
      SCOPE 1.1.2.1 BLOCK pos 24
        READ  err     pos 38`)

pass(`
  class A extends B {
    constructor
    (name) {
      super()
      this.name = name
    }

    update
    (state) {
      if (state.docChanged)
        console.log('yes')
    }
  }

  g = f({ a() { return new A('eg') } })
`,
     `SCOPE 1 GLOBAL pos 3
  SCOPE 1.1 MODULE pos 3
    LET   A     pos 9
    SCOPE 1.1.1 CLASS pos 9 name A
      LET   A     pos 9
      SCOPE 1.1.1.1 FUNCTION pos 43 name constructor
        LET   name     pos 44
        READ  name     pos 84
      SCOPE 1.1.1.2 FUNCTION pos 111 name update
        LET   state     pos 112
        READ  state     pos 131
    SCOPE 1.1.2 FUNCTION pos 198 name a
      READ  A     pos 214`)

pass(`
let clen

function parse
() {
  if (maybe())
    clen = get()

  if (check(clen)) {
    run()
    clen = 0
  }
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   clen     pos 5
    LET   parse     pos 20
    SCOPE 1.1.1 FUNCTION pos 25 name parse
      WRITE clen B C pos 62.4
      READ  clen     pos 76
      SCOPE 1.1.1.1 BLOCK pos 83
        WRITE clen   C pos 107.4`)

pass(`
function make
() {
  let clen

  function parse
  () {
    while (1) {
      if (maybe())
        clen = get()

      if (check(clen)) {
        run()
        clen = undefined
      }
      else
        break
    }
  }

  return 0
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   make     pos 10
    SCOPE 1.1.1 FUNCTION pos 14 name make
      LET   clen     pos 26
      LET   parse     pos 43
      SCOPE 1.1.1.1 FUNCTION pos 48 name parse
        SCOPE 1.1.1.1.1 BLOCK pos 70
          WRITE clen B C pos 111.4
          READ  clen     pos 129
          SCOPE 1.1.1.1.1.1 BLOCK pos 136
            READ  undefined     pos 167
            WRITE clen   C pos 176.4`)

pass(`
function initMouse
() {
  let hover

  function updateHover
  () {
    if (maybe()) {
      hover = 1
    }
    else if (hover) {
      hover = 0
    }
  }
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   initMouse     pos 10
    SCOPE 1.1.1 FUNCTION pos 19 name initMouse
      LET   hover     pos 31
      LET   updateHover     pos 49
      SCOPE 1.1.1.1 FUNCTION pos 60 name updateHover
        SCOPE 1.1.1.1.1 BLOCK pos 85
          WRITE hover   C pos 102.4
        READ  hover B C pos 122
        SCOPE 1.1.1.1.2 BLOCK pos 129
          WRITE hover   C pos 146.4`)

pass(`
export let wexts

export
function init
() {
  wexts = Mk.array
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   wexts     pos 12
    LET   init     pos 35
    SCOPE 1.1.1 FUNCTION pos 39 name init
      WRITE wexts     pos 63.4`)

pass(`
let classCache

export
function add
() {
  classCache = classCache || new Map()
}
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   classCache     pos 5
    LET   add     pos 33
    SCOPE 1.1.1 FUNCTION pos 36 name add
      READ  classCache     pos 57
      READ  Map     pos 75
      WRITE classCache     pos 80.4`)

fail(1, 'let x = 1; function foo() { return x }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   x     pos 4
    WRITE x     pos 4.4
    LET   foo     pos 20
    SCOPE 1.1.1 FUNCTION pos 23 name foo
      READ  x     pos 35`)

fail(1, 'let x; { let y = 1; x = y }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   x     pos 4
    SCOPE 1.1.1 BLOCK pos 7
      LET   y     pos 13
      WRITE y     pos 13.4
      READ  y     pos 24
      WRITE x     pos 25.4`)

fail(2, `
function f
(a, b, otherwise) {
  let c1, c2, ok

  if (a)
    ok = 4
  else
    ok = 1

  if (b) {
    c1 = 2
    b.forEach(d => {
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
`,
     `SCOPE 1 GLOBAL pos 1
  SCOPE 1.1 MODULE pos 1
    LET   f     pos 10
    SCOPE 1.1.1 FUNCTION pos 11 name f
      LET   a     pos 13
      LET   b     pos 16
      LET   otherwise     pos 19
      LET   c1     pos 38
      LET   c2     pos 42
      LET   ok     pos 46
      READ  a     pos 56
      WRITE ok B C pos 69.4
      WRITE ok B C pos 87.4
      READ  b     pos 95
      SCOPE 1.1.1.1 BLOCK pos 98
        WRITE c1     pos 110.4
        READ  b     pos 115
        SCOPE 1.1.1.1.1 FUNCTION pos 125
          LET   d     pos 125
          READ  d     pos 144
          WRITE c1     pos 145.4
        READ  c1     pos 164
      SCOPE 1.1.1.2 BLOCK pos 174
        READ  ok     pos 185
        WRITE c2     pos 187.4
        READ  ok     pos 198
        READ  ok     pos 203
        WRITE c2     pos 205.4
        READ  c2     pos 214
        READ  ok B C pos 236
      READ  otherwise     pos 253`)

fail(1, 'let a; try { f() } catch (err) { a = err.message; console.log(a) }',
     `SCOPE 1 GLOBAL pos 0
  SCOPE 1.1 MODULE pos 0
    LET   a     pos 4
    SCOPE 1.1.1 BLOCK pos 11
    SCOPE 1.1.2 CATCH pos 19
      LET   err     pos 26
      SCOPE 1.1.2.1 BLOCK pos 31
        READ  err     pos 37
        WRITE a     pos 48.4
        READ  a     pos 62`)

globalThis.describe('narrowest-scope', () => {
  for (let tc of validCases)
    globalThis.it(tc.code, () => _pass(tc))
  for (let tc of invalidCases)
    globalThis.it(tc.code, () => _fail(tc))
})
