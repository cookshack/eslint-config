import { isReadRef, isWriteRef, buildScopeTree, scopeStart } from './narrowest-scope.js'

let printBuffer

printBuffer = []

function print(...args) {
  printBuffer.push(args.join(' '))
}

function clearPrintBuffer() {
  printBuffer = []
}

function getPrintBuffer() {
  return printBuffer.join('\n')
}

function isForLoop(scope) {
  return scope.type == 'for' || scope.type == 'for-in' || scope.type == 'for-of'
}

function getFirstWriteInScope(treeNode) {
  for (let item of treeNode.items) {
    if (item.type == 'WRITE')
      return item
  }
  return null
}

function getFunctionDefsInBlock(block, scope) {
  let defs = []

  for (let child of scope.childScopes) {
    if (child.type == 'function' || child.type == 'arrow') {
      if (child.block.parent?.type == 'FunctionExpression' || child.block.parent?.type == 'ArrowFunctionExpression')
        continue
      defs.push(child)
    }
  }

  return defs
}

function findCallTargets(node, scopeToNode, currentScope) {
  let calls = []
  let currentNode = node

  while (currentNode && currentNode.type != 'BlockStatement' && currentNode.type != 'FunctionDeclaration') {
    if (currentNode.type == 'CallExpression') {
      let callee = currentNode.callee
      if (callee.type == 'Identifier') {
        let varInfo = scopeToNode.get(currentScope)?.scope.set.get(callee.name)
        if (varInfo) {
          for (let ref of varInfo.references) {
            if (ref.identifier == callee) {
              if (ref.from != currentScope) {
                let fnNode = scopeToNode.get(ref.from)
                if (fnNode && (fnNode.scope.type == 'function' || fnNode.scope.type == 'arrow')) {
                  calls.push(fnNode)
                }
              }
            }
          }
        }
      }
    }
    currentNode = currentNode.parent
  }

  return calls
}

function checkNodeBeforeWrite(context, node, scopeToNode, treeNode, varName, visitedFns, onRead) {
  if (node.type == 'BlockStatement') {
    for (let stmt of node.body) {
      checkStatement(context, stmt, scopeToNode, treeNode, varName, visitedFns, onRead)
    }
  }
}

function checkStatement(context, stmt, scopeToNode, treeNode, varName, visitedFns, onRead) {
  if (stmt.type == 'IfStatement') {
    checkNodeBeforeWrite(context, stmt.consequent, scopeToNode, treeNode, varName, visitedFns, onRead)
    if (stmt.alternate)
      checkNodeBeforeWrite(context, stmt.alternate, scopeToNode, treeNode, varName, visitedFns, onRead)
  } else if (stmt.type == 'WhileStatement' || stmt.type == 'DoWhileStatement') {
    checkNodeBeforeWrite(context, stmt.body, scopeToNode, treeNode, varName, visitedFns, onRead)
  } else if (stmt.type == 'ForStatement' || stmt.type == 'ForInStatement' || stmt.type == 'ForOfStatement') {
    checkNodeBeforeWrite(context, stmt.body, scopeToNode, treeNode, varName, visitedFns, onRead)
  } else if (stmt.type == 'SwitchStatement') {
    for (let c of stmt.cases) {
      checkNodeBeforeWrite(context, c.consequent, scopeToNode, treeNode, varName, visitedFns, onRead)
    }
  } else if (stmt.type == 'TryStatement') {
    if (stmt.handler)
      checkNodeBeforeWrite(context, stmt.handler.body, scopeToNode, treeNode, varName, visitedFns, onRead)
  } else if (stmt.type == 'WithStatement') {
    checkNodeBeforeWrite(context, stmt.body, scopeToNode, treeNode, varName, visitedFns, onRead)
  } else if (stmt.type == 'LabeledStatement') {
    checkStatement(context, stmt.body, scopeToNode, treeNode, varName, visitedFns, onRead)
  }
}

function processScope(context, scopeNode, varName, visitedFns, onRead, callPos) {
  let scopeName = scopeNode.scope.block?.id?.name ?? scopeNode.scope.type

  let firstWrite = getFirstWriteInScope(scopeNode)
  let writePos = firstWrite.pos
  console.log(`Step 1: ${scopeName} - first WRITE at ${writePos} for '${varName}'`)
  console.log(`Step 2: ${scopeName} - processing nodes before write`)

  for (let item of scopeNode.items) {
    if (item.pos >= writePos)
      break

    if (item.type == 'READ' && item.name == varName && !item.isConditional) {
      if (callPos !== undefined && item.pos >= callPos) {
        console.log(`Step 2: ${scopeName} - READ at ${item.pos} >= callPos ${callPos}, skip`)
        continue
      }
      console.log(`Step 2: ${scopeName} - found READ at ${item.pos}, report`)
      onRead(item.ref.identifier)
      return
    }

    if (item.type == 'READ' && item.name == varName && item.ref) {
      let calls = findCallTargets(item.ref.identifier.parent, scopeToNode, item.ref.from)
      for (let fnNode of calls) {
        if (!visitedFns.has(fnNode.scope)) {
          let thisCallPos = item.pos
          console.log(`Step 2: ${scopeName} - recursing into fn (call at ${thisCallPos})`)

          if (thisCallPos >= writePos) {
            console.log(`Step 2: ${scopeName} - call at ${thisCallPos} >= writePos ${writePos}, skip`)
            continue
          }

          let newVisited = new Set(visitedFns)
          newVisited.add(fnNode.scope)

          processScope(context, fnNode, varName, newVisited, onRead, thisCallPos)
        } else {
          console.log(`Step 2: ${scopeName} - fn already visited, skip`)
        }
      }
    }
  }

  for (let child of scopeNode.children) {
    if (isForLoop(child.scope)) {
      console.log(`Step 2: ${scopeName} - skipping for-loop child`)
      continue
    }

    let childStart = scopeStart(child.scope)
    console.log(`Step 2: ${scopeName} - checking child scope at ${childStart}`)

    if (childStart < writePos) {
      console.log(`Step 2: ${scopeName} - child start ${childStart} < writePos ${writePos}, checking items`)
      for (let item of child.items) {
        if (item.pos >= writePos)
          break
        if (item.type == 'READ' && item.name == varName && !item.isConditional) {
          console.log(`Step 2: ${scopeName} - found READ in child at ${item.pos}, report`)
          if (callPos !== undefined && item.pos >= callPos) {
            console.log(`Step 2: ${scopeName} - READ at ${item.pos} >= callPos ${callPos}, skip`)
            continue
          }
          onRead(item.ref.identifier)
          return
        }
      }
    } else {
      console.log(`Step 2: ${scopeName} - child start ${childStart} >= writePos ${writePos}, skip`)
    }
  }
}

function checkVariable(context, variable, scopeToNode, reported) {
  if (reported.has(variable))
    return
  if (variable.defs.length == 0)
    return
  if (['Parameter', 'FunctionName', 'ImportBinding', 'CatchClause', 'ClassName'].includes(variable.defs[0].type))
    return

  let defNode = variable.defs[0]?.name
  if (!defNode)
    return

  let defScope = variable.scope
  let defScopeNode = scopeToNode.get(defScope)
  if (!defScopeNode)
    return

  console.log(`\n=== Checking variable '${variable.name}' in scope '${defScopeNode.scope.block?.id?.name ?? defScopeNode.scope.type}' ===`)

  let firstWrite = getFirstWriteInScope(defScopeNode)
  if (!firstWrite) {
    console.log(`Step 1: no WRITE found for '${variable.name}', report "mustInit" and STOP`)
    reported.add(variable)
    context.report({
      node: defNode,
      messageId: 'mustInit',
      data: { name: variable.name }
    })
    return
  }

  processScope(context, defScopeNode, variable.name, new Set(), (identifier) => {
    reported.add(variable)
    context.report({
      node: identifier,
      messageId: 'initBeforeUse',
      data: { name: variable.name }
    })
  })
}

export function createInitBeforeUse(context) {
  let scopeManager

  clearPrintBuffer()
  scopeManager = context.sourceCode.scopeManager
  if (scopeManager)
    return {
      'Program:exit'() {
        let tree, scopeToNode, reported

        scopeToNode = new Map
        let astToTree = new Map
        tree = buildScopeTree(scopeManager.scopes[0], '1', scopeToNode, astToTree)
        reported = new Set

        processAst(context.sourceCode.ast, tree, astToTree, '', new Set())

        for (let variable of tree.scope.variables) {
          checkVariable(context, variable, scopeToNode, reported)
        }

        for (let child of tree.children) {
          checkChildScopes(context, child, reported, scopeToNode)
        }

        print(getPrintBuffer())
      }
    }
}

function processAst(astNode, parentTree, astToTree, indent, visited) {
  if (!astNode)
    return
  if (visited.has(astNode))
    return
  visited.add(astNode)

  let treeNode = astToTree.get(astNode) ?? parentTree

  let scopeName = treeNode?.scope ? `${treeNode.scope.type}` : 'no-scope'
  if (treeNode?.scope?.block?.id?.name)
    scopeName += `(${treeNode.scope.block.id.name})`
  console.log(`${indent}${astNode.type}`)
  console.log(`${indent}  | scope: ${scopeName}`)

  for (let item of treeNode?.items ?? []) {
    if (item.type === 'LET') {
      if (item.defNode?.parent === astNode)
        console.log(`${indent}  | ${item.type} ${item.name}`)
    } else if (item.ref) {
      if (astNode === item.ref.identifier)
        console.log(`${indent}  | ${item.type} ${item.name}`)
    }
  }

  let children = []

  if (astNode.body) {
    if (Array.isArray(astNode.body))
      children.push(...astNode.body)
    else
      children.push(astNode.body)
  }
  if (astNode.consequent)
    children.push(astNode.consequent)
  if (astNode.alternate)
    children.push(astNode.alternate)
  if (astNode.block)
    children.push(astNode.block)
  if (astNode.expression)
    children.push(astNode.expression)
  if (astNode.callee)
    children.push(astNode.callee)
  if (astNode.object)
    children.push(astNode.object)
  if (astNode.property)
    children.push(astNode.property)
  if (astNode.init)
    children.push(astNode.init)
  if (astNode.test)
    children.push(astNode.test)
  if (astNode.update)
    children.push(astNode.update)
  if (astNode.left)
    children.push(astNode.left)
  if (astNode.right)
    children.push(astNode.right)
  if (astNode.argument)
    children.push(astNode.argument)
  if (astNode.arguments)
    children.push(...astNode.arguments)
  if (astNode.elements)
    children.push(...astNode.elements)
  if (astNode.properties)
    children.push(...astNode.properties)

  for (let child of children) {
    processAst(child, treeNode, astToTree, indent + '  ', visited)
  }
}

function checkChildScopes(context, treeNode, reported, scopeToNode) {
  for (let variable of treeNode.scope.variables) {
    checkVariable(context, variable, scopeToNode, reported)
  }

  for (let child of treeNode.children) {
    checkChildScopes(context, child, reported, scopeToNode)
  }
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Warn when a variable is used before being explicitly initialized.' },
    messages: { initBeforeUse: "'{{name}}' used before initialization.",
                mustInit: "'{{name}}' must be initialized." },
    schema: []
  },
  create: createInitBeforeUse
}
