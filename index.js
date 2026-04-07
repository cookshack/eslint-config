import globals from 'globals'

export let rules, languageOptions, plugins

let printBuffer

printBuffer = []

function print (...args) {
  console.log(args.join(' '))
  printBuffer.push(args.join(' '))
}

function trace(...args) {
  console.log('TRACE', ...args)
}

export
function getPrintBuffer() {
  return printBuffer.join('\n')
}

function clearPrintBuffer() {
  printBuffer = []
}

function getNarrowestScope
(variable) {
  let common

  common = null
  for (let ref of variable.references) {
    if (variable.defs.some(def => def.name === ref.identifier))
      continue
    if (ref.from)
      if (common)
        common = getCommonAncestor(common, ref.from)
      else
        common = ref.from
  }
  return common
}

function getCommonAncestor
(scope1, scope2) {
  let ancestors, s

  ancestors = []
  s = scope1
  while (s) {
    if (s.type == 'global')
      break
    ancestors.push(s)
    s = s.upper
  }
  s = scope2
  while (s) {
    if (s.type == 'global')
      break
    if (ancestors.includes(s))
      return s
    s = s.upper
  }
  return scope1
}

function getDefinitionScope
(variable) {
  return variable.scope
}

function isWriteRef(ref) {
  let parent

  parent = ref.identifier.parent
  if (parent) {
    if (parent.type == 'AssignmentExpression' && parent.left == ref.identifier)
      return 1
    if (parent.type == 'UpdateExpression')
      return 1
    if (parent.type == 'VariableDeclarator' && parent.id == ref.identifier)
      return 1
  }
  return 0
}

function isReadRef
(ref) {
  if (isWriteRef(ref))
    return 0
  return 1
}

function getConditionalContext(ref) {
  let node, prevNode, scopeBlock

  scopeBlock = ref.from.block
  prevNode = ref.identifier
  node = ref.identifier.parent
  while (node) {
    if (node === scopeBlock)
      break
    if (node.type === 'IfStatement')
      if (prevNode === node.test || nodeContains(node.test, prevNode))
        prevNode = node
      else
        return 'B'
    else if ([ 'WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'SwitchStatement' ].includes(node.type))
      if (prevNode === node.test || nodeContains(node.test, prevNode))
        prevNode = node
      else
        return 'B'
    else
      prevNode = node
    node = node.parent
  }
  return ''
}

function nodeContains(node, target) {
  if (node === target)
    return true
  if (node && typeof node === 'object')
    for (let key in node)
      if (nodeHas(node[key], target))
        return true
  return false
}

function nodeHas(value, target) {
  if (value === target)
    return true
  if (Array.isArray(value))
    return value.some(v => nodeContains(v, target))
  return false
}

function isIdOfSameDeclarator(r, ref, declarator) {
  if (r == ref)
    return 0
  return r.identifier.parent === declarator &&
         declarator.id === r.identifier
}

function hasReadBeforeWriteInNestedScope(variable, defScope) {
  let nestedFunctions

  nestedFunctions = new Set(variable.references
    .filter(ref => {
      let refScope

      refScope = ref.from
      if (refScope == defScope)
        return 0
      return isProperAncestor(defScope, refScope) && (refScope.type == 'function' || refScope.type == 'arrow')
    })
    .map(ref => ref.from))
  for (let fnScope of nestedFunctions) {
    let fnRefs, hasRead, hasWrite

    fnRefs = variable.references.filter(ref => ref.from === fnScope || isProperAncestor(fnScope, ref.from))
    hasRead = fnRefs.some(ref => isReadRef(ref))
    hasWrite = fnRefs.some(ref => isWriteRef(ref))
    if (hasRead && hasWrite)
      return 1
  }
  return 0
}

function mayBeReadBeforeAnyWrite
(variable, scopeToNode) {
  for (let index = 0; index < variable.references.length; index++) {
    let ref, refNode, rItems, item

    ref = variable.references[index]

    if (isReadRef(ref)) {
      // a possible read
      console.log('DEBUG READ [B]')
      return 1
    }

    refNode = scopeToNode.get(ref.from)
    rItems = refNode.items.filter(i => i.ref == ref)
    if (rItems.length == 0)
      console.log('WARN rItems empty')
    if (rItems.length > 1)
      console.log('WARN rItems.length: ' + rItems.length)
    item = rItems[0]
    if (item.ctx == 'B') {
      console.log('DEBUG WRITE B')
      // a conditional write
      continue
    }
    // A guaranteed write before any possible read.
    console.log('DEBUG WRITE')
    return 0
  }
}

function isProperAncestor(ancestor, descendant) {
  let s

  s = descendant.upper
  while (s) {
    if (s == ancestor)
      return 1
    s = s.upper
  }
  return 0
}

function scopeStart(scope) {
  if (scope.block == null)
    return Infinity
  if (scope.type == 'function' && scope.block.id)
    return scope.block.id.range[1]
  if (scope.type == 'class' && scope.block.id)
    return scope.block.id.range[0]
  return scope.block.range[0]
}

function buildScopeTree(scope, prefix, scopeToNode) {
  let node, siblingNum

  node = {
    scope,
    prefix,
    items: [],
    children: []
  }
  scopeToNode.set(scope, node)

  siblingNum = 0
  for (let child of scope.childScopes) {
    siblingNum++
    node.children.push(buildScopeTree(child, prefix + '.' + siblingNum, scopeToNode))
  }

  for (let variable of scope.variables) {
    if (variable.defs.length > 0)
      node.items.push({ type: 'LET', name: variable.name, pos: variable.defs[0].name.range[0] })

    for (let ref of variable.references) {
      let targetNode, parent, sortPos, ctx

      targetNode = scopeToNode.get(ref.from)
      if (!targetNode)
        continue

      ctx = getConditionalContext(ref)
      parent = ref.identifier.parent
      if (isWriteRef(ref))
        if (ref.identifier.parent?.type == 'UpdateExpression') {
          targetNode.items.push({ ref, type: 'READ', name: ref.identifier.name, ctx, pos: ref.identifier.range[0] })
          targetNode.items.push({ ref, type: 'WRITE', name: ref.identifier.name, pos: ref.identifier.range[0] })
        }
        else if (ref.identifier.parent?.type == 'AssignmentExpression') {
          sortPos = parent.right.range[1] + 0.4
          targetNode.items.push({ ref, type: 'WRITE', name: ref.identifier.name, ctx, pos: sortPos })
        }
        else if (ref.identifier.parent?.type == 'VariableDeclarator')
          targetNode.items.push({ ref, type: 'WRITE', name: ref.identifier.name, pos: ref.identifier.range[0] + 0.4 })
        else
          targetNode.items.push({ ref, type: 'WRITE', name: ref.identifier.name, pos: ref.identifier.range[0] })
      else if (parent?.type == 'VariableDeclarator' && parent.init === ref.identifier) {
        sortPos = parent.id ? parent.id.range[0] - 0.4 : ref.identifier.range[0]
        targetNode.items.push({ ref, type: 'READ', name: ref.identifier.name, ctx, pos: sortPos })
      }
      else
        targetNode.items.push({ ref, type: 'READ', name: ref.identifier.name, ctx, pos: ref.identifier.range[0] })
    }
  }

  node.items.sort((a, b) => a.pos - b.pos)

  return node
}

function checkScopeNode(context, treeNode, reported, scopeToNode) {
  let indent

  reported = reported || new Set
  indent = '  '.repeat(treeNode.prefix.split('.').length - 1)

  for (let variable of treeNode.scope.variables) {
    let defNode

    if (reported.has(variable))
      continue
    if (variable.defs.length === 0)
      continue
    if ([ 'Parameter', 'FunctionName', 'ImportBinding', 'CatchClause', 'ClassName' ].includes(variable.defs[0].type))
      continue

    defNode = variable.defs[0]?.name
    if (defNode) {
      let defScope, narrowestScope, defNodePrefix, narrowestPrefix

      defScope = getDefinitionScope(variable)
      defNodePrefix = scopeToNode.get(defScope)?.prefix ?? '?'
      trace(indent, '1 found decl scope of', variable.name + ':', defNodePrefix + ' ' + defScope.type.toUpperCase())

      narrowestScope = getNarrowestScope(variable)
      narrowestPrefix = scopeToNode.get(narrowestScope)?.prefix ?? '?'
      trace(indent, '2 found narrowest scope of', variable.name + ':', narrowestPrefix + ' ' + narrowestScope?.type.toUpperCase())

      if (defScope == narrowestScope)
        continue
      trace(indent, '3', variable.name, 'could be moved to a narrower scope')

      if (defScope.type == 'for') {
        trace(indent, '4 exception:', variable.name, 'is in a for loop header')
        continue
      }
      if (0 && hasReadBeforeWriteInNestedScope(variable, defScope)) {
        trace(indent, '4 exception:', variable.name, 'hasReadBeforeWriteInNestedScope')
        continue
      }
      if (mayBeReadBeforeAnyWrite(variable, scopeToNode)) {
        trace(indent, '4 exception:', variable.name, 'mayBeReadBeforeAnyWrite')
        continue
      }

      trace(indent, '5', variable.name, 'is too broad')

      reported.add(variable)
      context.report({
        node: defNode,
        messageId: 'tooBroad',
        data: { name: variable.name }
      })
    }
  }

  for (let child of treeNode.children)
    checkScopeNode(context, child, reported, scopeToNode)
}

function printTree(node, siblingNum) {
  let prefix, all, indent

  prefix = siblingNum === 0 ? node.prefix : node.prefix.split('.').slice(0, -1).join('.') + '.' + siblingNum
  indent = '  '.repeat(prefix.split('.').length - 1)
  print(indent + 'SCOPE ' + prefix + ' ' + node.scope.type.toUpperCase() + ' pos ' + scopeStart(node.scope))

  all = [ ...node.items.map(i => ({ pos: i.pos, type: 'item', data: i })),
          ...node.children.map((c, i) => ({ pos: scopeStart(c.scope), type: 'scope', data: c, sibling: i + 1 })) ]
  all.sort((a, b) => a.pos - b.pos)

  for (let entry of all)
    if (entry.type === 'item')
      print(indent + '  ' + entry.data.type.padEnd(5) + ' ' + entry.data.name + (entry.data.ctx ? ' ' + entry.data.ctx : '').padEnd(3) + 'pos ' + entry.data.pos)
    else
      printTree(entry.data, entry.sibling)
}

function createNarrowestScope
(context) {
  let scopeManager

  clearPrintBuffer()
  scopeManager = context.sourceCode.scopeManager
  if (scopeManager)
    return {
      'Program:exit'() {
        let tree, scopeToNode

        scopeToNode = new Map
        tree = buildScopeTree(scopeManager.scopes[0], '1', scopeToNode)
        checkScopeNode(context, tree, null, scopeToNode)
        printTree(tree, 0)
      }
    }
}

function createPositiveVibes
(context) {
  return {
    UnaryExpression(node) {
      if (node.operator == '!')
        context.report({ node,
                         messageId: 'positiveVibes' })
    },
    BinaryExpression(node) {
      if (node.operator == '!=')
        context.report({ node,
                         messageId: 'equality' })
      else if (node.operator == '!==')
        context.report({ node,
                         messageId: 'strictEquality' })
    }
  }
}

plugins = { 'cookshack': { rules: { 'positive-vibes': { meta: { type: 'problem',
                                                                docs: { description: 'Prefer positive expressions.' },
                                                                messages: { positiveVibes: 'Be positive!',
                                                                            equality: 'Use ==.',
                                                                            strictEquality: 'Use ===.' },
                                                                schema: [] },
                                                        create: createPositiveVibes },
                                    'narrowest-scope': { meta: { type: 'suggestion',
                                                                 docs: { description: 'Enforce variables are declared in their narrowest possible scope.' },
                                                                 messages: { tooBroad: 'Variable "{{ name }}" is declared in a broader scope than necessary.' },
                                                                 schema: [] },
                                                         create: createNarrowestScope } } } }

rules = {
  'array-bracket-newline': [ 'error', 'never' ],
  'array-bracket-spacing': [ 'error', 'always' ],
  'arrow-parens': [ 'error', 'as-needed' ],
  'brace-style': [ 'error', 'stroustrup' ],
  'comma-dangle': 'error',
  'curly': [ 'error', 'multi' ],
  'eol-last': [ 'error', 'always' ],
  'function-paren-newline': [ 'error', 'never' ],
  'indent': [ 'error', 2, { ArrayExpression: 'first',
                            CallExpression: { arguments: 'first' },
                            //flatTernaryExpressions: true,
                            //offsetTernaryExpressions: true,
                            // ternary, because overhangs strangely (eg multiline in array def)
                            'ignoredNodes': [ 'ConditionalExpression' ],
                            FunctionDeclaration: { parameters: 'first', body: 1 },
                            FunctionExpression: { parameters: 'first', body: 1 },
                            ImportDeclaration: 'first',
                            ObjectExpression: 'first',
                            offsetTernaryExpressions: true,
                            VariableDeclarator: 'first' } ],
  'init-declarations': [ 'error', 'never', { 'ignoreForLoopInit': true } ],
  'keyword-spacing': [ 'error', { before: true, after: true } ],
  'linebreak-style': [ 'error', 'unix' ],
  'padding-line-between-statements': [ 'error',
                                       { blankLine: 'always', prev: 'let', next: '*' },
                                       { blankLine: 'never', prev: 'let', next: 'let' } ],
  'no-case-declarations': 'error',
  'no-global-assign': 'error',
  'cookshack/narrowest-scope': 'error',
  'cookshack/positive-vibes': 'error',
  'no-mixed-operators': 'error',
  'no-multi-spaces': 'error',
  'no-multiple-empty-lines': [ 'error', { max: 1, maxEOF: 0 } ],
  'no-negated-condition': 'error',
  'no-redeclare': 'error',
  'no-sequences': 'error',
  'no-sparse-arrays': 'error',
  'no-tabs': 'error',
  'no-trailing-spaces': 'error',
  'no-undef': 'error',
  'no-unsafe-negation': 'error',
  'no-unused-vars': 'error',
  'no-var': 'error',
  'object-curly-spacing': [ 'error', 'always' ],
  'object-shorthand': [ 'error', 'always' ],
  quotes: [ 'error', 'single', { avoidEscape: true } ],
  semi: [ 'error', 'never' ]
  //'vars-on-top': [ 'error' ], // want version for let
  //'newline-before-function-paren': ['error', 'always'],
}

languageOptions = {
  globals: {
    ...globals.node
  },
  parserOptions: {
    ecmaVersion: 2025,
    sourceType: 'module'
  }
}

export
default [ { ignores: [ 'TAGS.mjs' ] },
          { languageOptions,
            plugins,
            rules } ]
