function getStartColumn
(node) {
  let parent

  parent = node.parent
  if (node.type == 'FunctionExpression'
      && parent?.type == 'Property'
      && (parent.method || parent.kind == 'get' || parent.kind == 'set'))
    return parent.key.loc.start.column
  if (parent?.type == 'MethodDefinition')
    return
  return node.loc.start.column
}

function checkFunction
(node, context) {
  if (node.body.type == 'BlockStatement')
    if (node.body.loc.start.line == node.body.loc.end.line) {
      // single-line body, nothing to check
    }
    else {
      let startCol

      startCol = getStartColumn(node)

      if (startCol == null) {
        // skip (class methods)
      }
      else {
        let unit

        unit = context.options[0] ?? 2

        if (node.body.loc.end.column - 1 == startCol) {
          // ok
        }
        else
          context.report({ node: node.body,
                           messageId: 'indentFnBlock',
                           fix
                           (fixer) {
                             let closingBraceOffset, lineStart

                             closingBraceOffset = node.body.range[1] - 1
                             lineStart = closingBraceOffset - (node.body.loc.end.column - 1)
                             return fixer.replaceTextRange([ lineStart, closingBraceOffset ],
                                                           ' '.repeat(startCol))
                           } })

        for (let i = 0; i < node.body.body.length; i++) {
          let stmt

          stmt = node.body.body[i]
          if (stmt.loc.start.column == startCol + unit) {
            // ok
          }
          else
            context.report({ node: stmt,
                             messageId: 'indentFnBlock',
                             fix
                             (fixer) {
                               let expectedCol, delta, sourceCode, text, fixes

                               expectedCol = startCol + unit
                               delta = expectedCol - stmt.loc.start.column
                               sourceCode = context.sourceCode
                               text = sourceCode.getText()
                               fixes = []

                               fixes.push(fixer.replaceTextRange([ stmt.range[0] - stmt.loc.start.column, stmt.range[0] ],
                                                                 ' '.repeat(expectedCol)))

                               if (stmt.loc.start.line < stmt.loc.end.line) {
                                 let pos

                                 pos = stmt.range[0]

                                 do {
                                   let newlinePos, lineEnd, lineText, currentIndent

                                   newlinePos = text.indexOf('\n', pos)

                                   if (newlinePos < 0 || newlinePos >= stmt.range[1])
                                     break
                                   pos = newlinePos + 1

                                   lineEnd = text.indexOf('\n', pos)
                                   if (lineEnd < 0 || lineEnd > stmt.range[1])
                                     lineEnd = stmt.range[1]

                                   lineText = text.slice(pos, lineEnd)
                                   currentIndent = lineText.search(/\S/)
                                   if (currentIndent >= 0) {
                                     let newIndent

                                     newIndent = currentIndent + delta
                                     if (newIndent < 0)
                                       newIndent = 0
                                     fixes.push(fixer.replaceTextRange([ pos, pos + currentIndent ],
                                                                       ' '.repeat(newIndent)))
                                   }

                                   pos = lineEnd
                                 } while (pos < stmt.range[1])
                               }

                               return fixes
                             } })
        }
      }
    }
}

function create
(context) {
  return { FunctionDeclaration: node => checkFunction(node, context),
           FunctionExpression: node => checkFunction(node, context),
           ArrowFunctionExpression: node => checkFunction(node, context) }
}

export
default { meta: { type: 'suggestion',
                  fixable: 'code',
                  docs: { description: 'Require consistent indentation of function body blocks.' },
                  messages: { indentFnBlock: 'Fn block indent' },
                  schema: [] },
          create }
