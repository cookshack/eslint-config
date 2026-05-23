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
          context.report({ node: node.body, messageId: 'indentFnBlock' })

        for (let i = 0; i < node.body.body.length; i++) {
          let stmt

          stmt = node.body.body[i]
          if (stmt.loc.start.column == startCol + unit) {
            // ok
          }
          else
            context.report({ node: stmt, messageId: 'indentFnBlock' })
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
                  docs: { description: 'Require consistent indentation of function body blocks.' },
                  messages: { indentFnBlock: 'Fn block indent' },
                  schema: [] },
          create }
