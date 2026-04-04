import globals from 'globals'

export let rules, languageOptions, plugins

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
  }
  return 0
}

function isReadRef
(ref) {
  if (isWriteRef(ref))
    return 0
  return 1
}

function hasReadBeforeWriteInNestedScope(variable, defScope) {
  let nestedScopes

  nestedScopes = new Set(variable.references
    .filter(ref => {
      let refScope

      refScope = ref.from
      if (refScope == defScope)
        return 0
      return refScope.upper == defScope
    })
    .map(ref => ref.from))
  for (let scope of nestedScopes) {
    let refsInScope, hasRead, hasWrite, defIsProperAncestor, isFunction

    defIsProperAncestor = isProperAncestor(defScope, scope)
    isFunction = scope.type == 'function' || scope.type == 'arrow'
    refsInScope = variable.references.filter(ref => ref.from == scope)
    hasRead = refsInScope.some(ref => isReadRef(ref))
    hasWrite = refsInScope.some(ref => isWriteRef(ref))
    if (hasRead && hasWrite && defIsProperAncestor && isFunction)
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

function createPositiveVibes
(context) {
  let scopeManager

  scopeManager = context.sourceCode.scopeManager
  if (scopeManager) {
    let allScopes, reported

    allScopes = scopeManager.scopes
    reported = new Set

    return {
      'Program:exit'() {
        for (let scope of allScopes)
          for (let variable of scope.variables)
            if (variable.defs.length > 0) {
              let node

              if (reported.has(variable))
                continue
              if (variable.defs[0].type == 'Parameter')
                continue
              if (variable.defs[0].type == 'FunctionName')
                continue
              if (variable.defs[0].type == 'ImportBinding')
                continue

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
      }
    }
  }
}

plugins = { 'cookshack': { rules: { 'positive-vibes': { meta: { type: 'problem',
                                                                docs: { description: 'Prefer positive expressions.' },
                                                                messages: { positiveVibes: 'Be positive!',
                                                                            equality: 'Use ==.',
                                                                            strictEquality: 'Use ===.' },
                                                                schema: [] },
                                                        create(context) {
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
                                                        } },
                                    'narrowest-scope': { meta: { type: 'suggestion',
                                                                 docs: { description: 'Enforce variables are declared in their narrowest possible scope.' },
                                                                 messages: { tooBroad: 'Variable "{{ name }}" is declared in a broader scope than necessary.' },
                                                                 schema: [] },
                                                         create: createPositiveVibes } } } }

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
