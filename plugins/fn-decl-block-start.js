function
FunctionDeclaration
(context, node) {
  let parent

  for (parent = node.parent; parent; parent = parent.parent)
    if (parent.type == 'BlockStatement')
      break

  if (parent) {
    let idx

    if (parent.parent?.type == 'CatchClause')
      return

    idx = parent.body.indexOf(node)
    for (let i = 0; i < idx; i++) {
      if (parent.body[i].type == 'VariableDeclaration'
          || parent.body[i].type == 'FunctionDeclaration'
          || parent.body[i].type == 'EmptyStatement')
        continue
      context.report({ node, messageId: 'fnDeclBlockStart' })
      return
    }
  }
}

function create
(context) {
  return { FunctionDeclaration: node => FunctionDeclaration(context, node) }
}

export
default { meta: { type: 'suggestion',
                  docs: { description: 'Require function declarations to be at the start of the block.' },
                  messages: { fnDeclBlockStart: 'FunctionDeclaration must be at the start of the block (after VariableDeclarations).' },
                  schema: [] },
          create }
