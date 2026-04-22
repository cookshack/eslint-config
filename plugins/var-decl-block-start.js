function
VariableDeclaration
(context, node) {
  let parent

  parent = node.parent

  for (parent = node.parent; parent; parent = parent.parent)
    if (parent.type == 'BlockStatement')
      break

  if (parent) {
    let idx

    if (parent.parent?.type == 'CatchClause')
      return

    idx = parent.body.indexOf(node)
    for (let i = 0; i < idx; i++) {
      if (parent.body[i].type == 'VariableDeclaration')
        continue
      context.report({ node, messageId: 'varDeclBlockStart' })
      return
    }
  }
}
function create
(context) {
  return { VariableDeclaration: node => VariableDeclaration(context, node) }
}

export
default { meta: { type: 'suggestion',
                  docs: { description: 'Require variable declarations to be at the start of the block.' },
                  messages: { varDeclBlockStart: 'VarDecl must be at start of block.' },
                  schema: [] },
          create }
