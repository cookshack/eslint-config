function create
(context) {
  return { VariableDeclaration(node) {
    if (node.kind == 'const' || node.kind == 'var')
      context.report({ node, messageId: 'useLet' })
  } }
}

export
default { meta: { type: 'problem',
                  docs: { description: 'Enforce use of let instead of const or var.' },
                  messages: { useLet: 'Use let.' },
                  schema: [] },
          create }
