import globals from 'globals'

export let rules, languageOptions, plugins

plugins = { 'cookshack': { rules: { 'no-logical-not': { meta: { type: 'problem',
                                                                docs: { description: 'Prevent !.' },
                                                                messages: { logicalNot: 'Logical not used.',
                                                                            inequality: 'Inequality operator used.',
                                                                            strictInequality: 'Strict inequality operator used.' },
                                                                schema: [] }, // options
                                                        create(context) {
                                                          return {
                                                            UnaryExpression(node) {
                                                              if (node.operator == '!')
                                                                context.report({ node,
                                                                                 messageId: 'logicalNot' })
                                                            },
                                                            BinaryExpression(node) {
                                                              if (node.operator == '!=')
                                                                context.report({ node,
                                                                                 messageId: 'inequality' })
                                                              else if (node.operator == '!==')
                                                                context.report({ node,
                                                                                 messageId: 'strictInequality' })
                                                            }
                                                          }
                                                        } } } } }

rules = {
  'array-bracket-newline': [ 'error', 'never' ],
  'array-bracket-spacing': [ 'error', 'always' ],
  'arrow-parens': [ 'error', 'as-needed' ],
  'brace-style': [ 'error', 'stroustrup' ],
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
  'cookshack/no-logical-not': 'error',
  'no-multi-spaces': 'error',
  'no-multiple-empty-lines': [ 'error', { max: 1, maxEOF: 0 } ],
  'no-negated-condition': 'error',
  'no-redeclare': 'error',
  'no-sequences': 'error',
  'no-tabs': 'error',
  'no-trailing-spaces': 'error',
  'no-undef': 'error',
  'no-unsafe-negation': 'error',
  'no-unused-vars': 'error',
  'no-var': 'error',
  'object-curly-spacing': [ 'error', 'always' ],
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
    ecmaVersion: 2022,
    sourceType: 'module'
  }
}
