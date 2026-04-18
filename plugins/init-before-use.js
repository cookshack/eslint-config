import { buildScopeTree } from './narrowest-scope.js'

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

function createInitBeforeUse(context) {
  let scopeManager

  clearPrintBuffer()
  scopeManager = context.sourceCode.scopeManager
  if (scopeManager)
    return {
      'Program:exit'() {
        let tree, scopeToNode, reported

        scopeToNode = new Map
        let astToTree = new Map
        let astToCst = new Map
        tree = buildScopeTree(scopeManager.scopes[0], '1', scopeToNode, astToTree)
        reported = new Set

        let cst = processAst(context.sourceCode.ast, null, astToTree, astToCst, '', new Set())

        cstAnnotate(cst, astToCst, context)

        cstCheck(cst, context)

        console.log('\n=== CST TREE ===')
        printCst(cst, '')

        print(getPrintBuffer())
      }
    }
}

let cstIdCounter = 0

function processAst(astNode, parentCst, astToTree, astToCst, indent, visited) {
  if (!astNode)
    return
  if (visited.has(astNode))
    return
  visited.add(astNode)

  let treeNode = astToTree.get(astNode) ?? parentCst?.treeNode

  let scopeName = treeNode?.scope ? `${treeNode.scope.type}` : 'no-scope'
  if (treeNode?.scope?.block?.id?.name)
    scopeName += `(${treeNode.scope.block.id.name})`
  console.log(`${indent}${astNode.type}`)
  console.log(`${indent}  | scope: ${scopeName}`)

  let lets = []
  let reads = []
  let writes = []

  for (let item of treeNode?.items ?? []) {
    if (item.type === 'LET' && item.defType !== 'FunctionName' && item.defType !== 'Parameter') {
      let scopeCreator = treeNode?.scope?.block
      if (scopeCreator && astNode === scopeCreator) {
        lets.push({ item })
        console.log(`${indent}  | LET ${item.name}`)
      }
    } else if (item.ref) {
      if (astNode === item.ref.identifier) {
        if (item.type === 'READ') {
          reads.push({ item })
          console.log(`${indent}  | READ ${item.name}`)
        } else if (item.type === 'WRITE') {
          writes.push({ item })
          console.log(`${indent}  | WRITE ${item.name}`)
        }
      }
    }
  }

  let cst = {
    id: cstIdCounter++,
    astNode,
    treeNode,
    scopeItems: treeNode?.items ?? [],
    lets,
    reads,
    writes,
    children: [],
    fnDefCst: null
  }

  astToCst.set(astNode, cst)

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
  if (astNode.id)
    children.push(astNode.id)
  if (astNode.declarations)
    children.push(...astNode.declarations)
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
    let childCst = processAst(child, cst, astToTree, astToCst, indent + '  ', visited)
    if (childCst)
      cst.children.push(childCst)
  }

  return cst
}

function cstAnnotate(cst, astToCst, context) {
  if (!cst)
    return

  for (let letInfo of cst.lets) {
    let writeNode = findFirstWrite(cst, letInfo)
    letInfo.firstWrite = writeNode
    if (!writeNode) {
      context.report({
        node: letInfo.item.identifier,
        messageId: 'mustInit',
        data: { name: letInfo.item.name }
      })
    }
  }

  if (cst.astNode.type === 'CallExpression' && cst.astNode.callee?.type === 'Identifier') {
    for (let child of cst.children) {
      if (child.astNode === cst.astNode.callee && child.reads.length > 0) {
        let readRef = child.reads[0].item.ref
        if (readRef?.resolved) {
          let variable = readRef.resolved
          if (variable.defs.length > 0) {
            let fnDefAst = variable.defs[0].node
            console.log(`cstAnnotate: callee=${cst.astNode.callee.name}, defs[0].node.type=${fnDefAst.type}`)
            console.log(`cstAnnotate: defs[0].node id=${fnDefAst.id?.name}`)
            if (fnDefAst) {
              cst.fnDefCst = astToCst.get(fnDefAst)
              console.log(`cstAnnotate: fnDefAst=${fnDefAst?.type}, fnDefAst.id.name=${fnDefAst?.id?.name}`)
              console.log(`cstAnnotate: CALL -> fnDefCst ${cst.fnDefCst?.id} (astToCst size=${astToCst.size})`)
              if (!cst.fnDefCst) {
                console.log(`cstAnnotate: WARN - astToCst has keys:`, [...astToCst.keys()].map(k => `${k.type}(${k.id?.name})`))
              }
            }
          }
        }
      }
    }
  }

  for (let child of cst.children) {
    cstAnnotate(child, astToCst, context)
  }
}

function findFirstWrite(cst, letInfo) {
  return findFirstWriteInSubtree(cst, letInfo)
}

function findFirstWriteInSubtree(cst, letInfo) {
  if (!cst)
    return null

  for (let writeInfo of cst.writes) {
    let writeVar = writeInfo.item.ref.resolved
    if (writeVar === letInfo.item.variable)
      return cst
  }

  for (let child of cst.children) {
    let result = findFirstWriteInSubtree(child, letInfo)
    if (result)
      return result
  }

  return null
}

function cstCheck(cst, context) {
  if (!cst)
    return

  for (let letInfo of cst.lets) {
    if (letInfo.firstWrite) {
      walk2Start(cst, letInfo, context)
    }
  }

  for (let child of cst.children) {
    cstCheck(child, context)
  }
}

function walk2Start(node, letInfo, context) {
  if (node.astNode.type === 'FunctionDeclaration') {
    for (let child of node.children) {
      if (child.astNode.type === 'BlockStatement') {
        return walk2(child, letInfo, context, new Set())
      }
    }
  }
  return walk2(node, letInfo, context, new Set())
}

function walk2(node, letInfo, context, visited) {
  if (!node)
    return false

  if (node.astNode.type === 'FunctionDeclaration')
    return false

  console.log(`walk2: node=${node.id} ${node.astNode.type}, let=${letInfo.item.name}, firstWrite=${letInfo.firstWrite?.id}`)

  if (node === letInfo.firstWrite)
    return true

  if (node.astNode.type === 'CallExpression' && node.fnDefCst) {
    let fnVar = node.fnDefCst.astNode.id
    let key = `${letInfo.item.name}:${fnVar.name}`
    console.log(`walk2: CALL ${fnVar.name}, key=${key}, visited=${[...visited]}`)
    if (!visited.has(key)) {
      visited.add(key)
      for (let child of node.fnDefCst.children) {
        console.log(`walk2: checking child ${child.id} ${child.astNode.type}`)
        if (child.astNode.type === 'BlockStatement' && walk2(child, letInfo, context, visited))
          return true
      }
    }
  }

  for (let readInfo of node.reads) {
    if (readInfo.item.ref.resolved === letInfo.item.variable) {
      context.report({
        node: readInfo.item.ref.identifier,
        messageId: 'initBeforeUse',
        data: { name: letInfo.item.name }
      })
    }
  }

  for (let child of node.children) {
    if (walk2(child, letInfo, context, visited))
      return true
  }

  return false
}

function printCst(cst, indent) {
  if (!cst)
    return

  let lets = cst.lets.length ? ` LET: ${cst.lets.map(l => l.item.name + (l.firstWrite ? ` (fw:${l.firstWrite.id})` : ' (no fw)')).join(', ')}` : ''
  let reads = cst.reads.length ? ` READ: ${cst.reads.map(r => r.item.name).join(', ')}` : ''
  let writes = cst.writes.length ? ` WRITE: ${cst.writes.map(w => w.item.name).join(', ')}` : ''
  let fnDef = cst.fnDefCst ? ` fnDefCst:${cst.fnDefCst.id}` : ''
  let extra = lets + reads + writes + fnDef

  let scopeName = cst.treeNode?.scope ? `${cst.treeNode.scope.type}` : 'no-scope'
  if (cst.treeNode?.scope?.block?.id?.name)
    scopeName += `(${cst.treeNode.scope.block.id.name})`

  console.log(`${indent}${cst.id} ${cst.astNode.type} [${scopeName}]${extra}`)

  for (let child of cst.children) {
    printCst(child, indent + '  ')
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
