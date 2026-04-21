import globals from 'globals'
import narrowestScopePlugin from './plugins/narrowest-scope.js'
import { getPrintBuffer } from './plugins/narrowest-scope.js'
import positiveVibesPlugin from './plugins/positive-vibes.js'
import useRiskyEqualPlugin from './plugins/use-risky-equal.js'
import alwaysLetPlugin from './plugins/always-let.js'
import initBeforeUsePlugin from './plugins/init-before-use.js'
import declBlockStartPlugin from './plugins/decl-block-start.js'

export { getPrintBuffer }

export let rules, languageOptions, plugins

plugins = { 'cookshack': { rules: { 'positive-vibes': positiveVibesPlugin,
                                    'narrowest-scope': narrowestScopePlugin,
                                    'use-risky-equal': useRiskyEqualPlugin,
                                    'always-let': alwaysLetPlugin,
                                    'init-before-use': initBeforeUsePlugin,
                                    'decl-block-start': declBlockStartPlugin } } }

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
  'cookshack/positive-vibes': 'error',
  'cookshack/narrowest-scope': 'error',
  'cookshack/use-risky-equal': 'error',
  'cookshack/always-let': 'error',
  // using implicit init to undefined fits better
  //'cookshack/init-before-use': 'error',
  'cookshack/decl-block-start': 'error',
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
