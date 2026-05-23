import { Linter } from 'eslint'
import { plugins, rules, languageOptions } from '../../index.js'
import assert from 'node:assert'

let linter

linter = new Linter()

globalThis.describe('indent + indent-fn-block',
                    () => {
                      globalThis.it('indent catches nested body indent, indent-fn-block catches direct body statements',
                                    () => {
                                      let messages, byRule

                                      messages = linter.verify(`
if (true)
console.log(1)

function f
(x) {
    let val
    if (val)
    console.log(val)
}
`,
                                                                [ { languageOptions, plugins, rules } ])

                                      byRule = (rule, line) => messages.some(m => m.ruleId == rule && m.line == line)

                                      assert.ok(byRule('indent', 3))
                                      assert.ok(byRule('cookshack/indent-fn-block', 7))
                                      assert.ok(byRule('cookshack/indent-fn-block', 8))
                                      assert.ok(byRule('indent', 9))
                                    })
                    })
