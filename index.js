import globals from 'globals'

export let rules, languageOptions, plugins

let print

print = console.log

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

function isRightSideOfAssignment(r, ref) {
  if (r == ref)
    return 0
  return r.identifier.parent === ref.identifier.parent &&
         ref.identifier.parent?.right === r.identifier
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

function createNarrowestScope
(context) {
  let scopeManager

  scopeManager = context.sourceCode.scopeManager
  if (scopeManager) {
    let allScopes, reported

    allScopes = scopeManager.scopes
    reported = new Set

    return {
      'Program:exit'() {
        let scopeInfo

        scopeInfo = new WeakMap
        function visit(scope, prefix) {
          let siblingNum

          print('SCOPE', prefix, scope.type.toUpperCase())
          {
            let items, info

            items = []
            for (let variable of scope.variables) {
              if (variable.defs.length > 0)
                items.push({ pos: variable.defs[0].name.range[0], text: 'LET ' + variable.name })
              for (let ref of variable.references) {
                let refInfo

                refInfo = scopeInfo.get(ref.from)
                if (refInfo) {
                }
                else {
                  refInfo = { refs: [] }
                  scopeInfo.set(ref.from, refInfo)
                }
                refInfo.refs.push(ref)
              }
            }
            info = scopeInfo.get(scope)
            if (info)
              for (let ref of info.refs) {
                let parent, sortPos

                parent = ref.identifier.parent
                if (isWriteRef(ref))
                  if (ref.identifier.parent?.type == 'UpdateExpression')
                    items.push({ pos: ref.identifier.range[0], text: 'READ ' + ref.identifier.name },
                               { pos: ref.identifier.range[0], text: 'WRITE ' + ref.identifier.name })
                  else if (ref.identifier.parent?.type == 'AssignmentExpression') {
                    let rightRef

                    rightRef = info.refs.find(r => isRightSideOfAssignment(r, ref))
                    if (rightRef)
                      sortPos = rightRef.identifier.range[0] - 0.4
                    else
                      sortPos = ref.identifier.range[0]
                    items.push({ pos: sortPos, text: 'WRITE ' + ref.identifier.name })
                  }
                  else if (ref.identifier.parent?.type == 'VariableDeclarator')
                    items.push({ pos: ref.identifier.range[0] + 0.4, text: 'WRITE ' + ref.identifier.name })
                  else
                    items.push({ pos: ref.identifier.range[0], text: 'WRITE ' + ref.identifier.name })
                else if (parent?.type == 'VariableDeclarator' && parent.init === ref.identifier) {
                  let idRef

                  idRef = info.refs.find(r => isIdOfSameDeclarator(r, ref, parent))
                  if (idRef)
                    sortPos = idRef.identifier.range[0] - 0.4
                  else
                    sortPos = ref.identifier.range[0]
                  items.push({ pos: sortPos, text: 'READ ' + ref.identifier.name })
                }
                else
                  items.push({ pos: ref.identifier.range[0], text: 'READ ' + ref.identifier.name })
              }
            items.sort((a, b) => {
              if (a.pos == b.pos) {
                if (a.text.startsWith('READ') && b.text.startsWith('WRITE'))
                  return -1
                if (a.text.startsWith('WRITE') && b.text.startsWith('READ'))
                  return 1
                return 0
              }
              return a.pos - b.pos
            })
            for (let item of items)
              print(item.text.replace(/^(LET|READ|WRITE)/, m => m.padEnd(5)) + '  (pos ' + item.pos + ')')
          }
          for (let variable of scope.variables) {
            if (reported.has(variable))
              continue
            if (variable.defs.length === 0)
              continue
            if (variable.defs[0].type == 'Parameter')
              continue
            if (variable.defs[0].type == 'FunctionName')
              continue
            if (variable.defs[0].type == 'ImportBinding')
              continue
            if (variable.defs[0].type == 'CatchClause')
              continue
            if (variable.defs[0].type == 'ClassName')
              continue

            let node

            node = variable.defs[0]?.name
            if (node) {
              let defScope, narrowestScope

              defScope = getDefinitionScope(variable)
              narrowestScope = getNarrowestScope(variable)

              if (narrowestScope) {
                if (defScope.type == 'for')
                  continue
                if (defScope === narrowestScope)
                  continue
                if (hasReadBeforeWriteInNestedScope(variable, defScope))
                  continue

                reported.add(variable)
                context.report({
                  node,
                  messageId: 'tooBroad',
                  data: { name: variable.name }
                })
              }
            }
          }
          siblingNum = 0
          for (let child of scope.childScopes) {
            siblingNum++
            visit(child, prefix + '.' + siblingNum)
          }
        }

        visit(allScopes[0], '1')
      }
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
