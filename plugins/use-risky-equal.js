export
default { meta: { type: 'problem',
                  docs: { description: 'Enforce use of == instead of ===.' },
                  messages: { risky: 'Use ==.' },
                  schema: [] },
          create(context) {
            return { BinaryExpression(node) {
              if (node.operator == '===')
                context.report({ node, messageId: 'risky' })
            } }
          } }
