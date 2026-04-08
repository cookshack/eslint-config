function createPositiveVibes
(context) {
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
}

export
default { meta: { type: 'problem',
                  docs: { description: 'Prefer positive expressions.' },
                  messages: { positiveVibes: 'Be positive!',
                              equality: 'Use ==.',
                              strictEquality: 'Use ===.' },
                  schema: [] },
          create: createPositiveVibes }
