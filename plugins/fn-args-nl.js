function FnArgsNl
(node, context) {
  let nameLine, parenLine, nameEnd, i, newlines, parent

  parent = node.parent

  if (parent?.type == 'Property' && (parent.method || parent.kind == 'get' || parent.kind == 'set')) {
    nameLine = parent.key.loc.start.line
    nameEnd = parent.key.range[1]
  }
  else if (parent?.type == 'MethodDefinition') {
    nameLine = parent.key.loc.start.line
    nameEnd = parent.key.range[1]
  }
  else {
    nameLine = node.loc.start.line
    nameEnd = node.range[0]
  }

  i = nameEnd
  newlines = 0
  while (i < context.sourceCode.text.length) {
    if (context.sourceCode.text[i] == '(')
      break
    if (context.sourceCode.text[i] == '\n')
      newlines++
    i++
  }

  parenLine = nameLine + newlines

  if (parenLine - nameLine == 1)
    return
  context.report({ node, messageId: 'fnArgsNl' })
}

function create
(context) {
  return { FunctionDeclaration: node => FnArgsNl(node, context),
           FunctionExpression: node => FnArgsNl(node, context) }
}

export default { meta: { type: 'suggestion',
                         docs: { description: 'Require function args on the line immediately after the function name.' },
                         messages: { fnArgsNl: 'Fn args must be on the line immediately after the function name.' },
                         schema: [] },
                 create }
