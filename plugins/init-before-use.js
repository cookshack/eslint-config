function create
(context) {
}

export
default { meta: { type: 'problem',
                  docs: { description: 'Warn when a variable is used before being explicitly initialized.' },
                  messages: { initBeforeUse: "'{{name}}' used before initialization." },
                  schema: [] },
          create }
