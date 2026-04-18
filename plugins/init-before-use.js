function create
(context) {
  let scopeStack

  function getCurrentScope
  () {
    return scopeStack[scopeStack.length - 1]
  }

  function enterScope
  () {
    scopeStack.push({ declarations: new Map(), references: new Map() })
  }

  function exitScope
  () {
    let scope, decl, ref, declStart, refStart

    scope = getCurrentScope()

    for ([ decl, declStart ] of scope.declarations)
      for ([ ref, refStart ] of scope.references.get(decl) || [])
        if (refStart < declStart)
          context.report({ node: ref, messageId: 'initBeforeUse', data: { name: ref.name } })

    scopeStack.pop()
  }

  scopeStack = []

  return { 'Program': enterScope,
           'FunctionDeclaration': enterScope,
           'FunctionExpression': enterScope,
           'ArrowFunctionExpression': enterScope,
           'Program:exit': exitScope,
           'FunctionDeclaration:exit': exitScope,
           'FunctionExpression:exit': exitScope,
           'ArrowFunctionExpression:exit': exitScope,
           'VariableDeclaration'(node) {
             let scope, start

             scope = getCurrentScope()
             start = node.range[0]

             if (node.parent.type == 'ForOfStatement')
               return

             for (let decl of node.declarations)
               if (decl.id.type == 'Identifier') {
                 let name

                 name = decl.id.name
                 scope.declarations.set(name, start)
               }
           },
           'Identifier'(node) {
             let scope, parent, grandParent, pair, name, refs

             function isBindingSite
             () {
               if (parent.type == 'Property' && parent.key == node) {
                 if (parent.parent.type == 'ObjectExpression')
                   return 0
                 return 1
               }
               return 0
             }

             parent = node.parent
             grandParent = parent?.parent

             if (parent.type == 'VariableDeclarator' && parent.id == node)
               return

             if (grandParent?.type == 'FunctionDeclaration' && grandParent.id == node)
               return

             if (parent.type == 'MemberExpression' && parent.property == node)
               return

             if (isBindingSite())
               return

             scope = getCurrentScope()
             name = node.name
             pair = [ node, node.range[0] ]

             refs = scope.references.get(name)
             if (refs)
               refs.push(pair)
             else
               scope.references.set(name, [ pair ])
           } }
}

export
default { meta: { type: 'problem',
                  docs: { description: 'Warn when a variable is used before initialization.' },
                  messages: { initBeforeUse: "'{{name}}' used before initialization." },
                  schema: [] },
          create }
