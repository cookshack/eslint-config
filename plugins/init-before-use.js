function create
(context) {
  let scopeStack

  function getCurrentScope
  () {
    return scopeStack[scopeStack.length - 1]
  }

  function enterScope
  () {
    scopeStack.push({ declarations: new Map(), references: new Map(), assignments: new Map() })
  }

  function exitScope
  () {
    let scope, decl, ref, declStart, refStart, idx

    scope = getCurrentScope()

    for ([ decl, declStart ] of scope.declarations) {
      let initStart

      initStart = scope.assignments.get(decl)
      for ([ ref, refStart ] of scope.references.get(decl) || [])
        if (refStart < declStart || (initStart && refStart < initStart))
          context.report({ node: ref, messageId: 'initBeforeUse', data: { name: ref.name } })
    }

    idx = scopeStack.length - 2
    if (idx >= 0) {
      let parentScope

      parentScope = scopeStack[idx]
      scope.references.forEach((refs, n) => {
        let upRefs

        upRefs = parentScope.references.get(n)
        if (upRefs) {
        }
        else {
          upRefs = []
          parentScope.references.set(n, upRefs)
        }
        refs.forEach(pair => upRefs.push(pair))
      })
    }

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
                 if (decl.init)
                   scope.assignments.set(name, decl.init.range[0])
               }
           },
           'AssignmentExpression'(node) {
             if (node.left.type == 'Identifier') {
               let scope, left

               scope = getCurrentScope()
               left = node.left.name
               if (scope.declarations.has(left)) {
                 let existing

                 existing = scope.assignments.get(left)
                 if (existing && (node.right.range[0] >= existing))
                   return
                 scope.assignments.set(left, node.right.range[0])
               }
             }
           },
           'Identifier'(node) {
             let scope, parent, grandParent, pair, name, refs

             parent = node.parent
             grandParent = parent?.parent

             if (parent.type == 'VariableDeclarator' && parent.id == node)
               return

             if (parent.type == 'AssignmentExpression' && parent.left == node)
               return

             if (grandParent?.type == 'FunctionDeclaration' && grandParent.id == node)
               return

             if (parent.type == 'MemberExpression' && parent.property == node)
               return

             if (parent.type == 'Property' && parent.key == node && parent.parent.type == 'ObjectExpression')
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
