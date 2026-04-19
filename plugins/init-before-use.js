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
        let astToOst = new Map
        tree = buildScopeTree(scopeManager.scopes[0], '1', scopeToNode, astToTree)
        reported = new Set

        let ost = processAst(context.sourceCode.ast, null, astToTree, astToOst, '', new Set())

        ostAnnotate(ost, astToOst, context)

        ostCheck(ost, context)

        console.log('\n=== Ordered Syntax Tree ===')
        printOst(ost, '')

        print(getPrintBuffer())
      }
    }
}

let ostIdCounter = 0

function processAst(astNode, parentOst, astToTree, astToOst, indent, visited) {
  if (!astNode)
    return
  if (visited.has(astNode))
    return
  visited.add(astNode)

  let treeNode = astToTree.get(astNode) ?? parentOst?.treeNode

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
        console.log(`${indent}  | LET ${item.name}:${item.varId}`)
      }
    } else if (item.ref) {
      if (astNode === item.ref.identifier) {
        if (item.type === 'READ') {
          reads.push({ item })
          console.log(`${indent}  | READ ${item.name}:${item.varId}`)
        } else if (item.type === 'WRITE') {
          writes.push({ item })
          console.log(`${indent}  | WRITE ${item.name}:${item.varId}`)
        }
      }
    }
  }

  let ost = {
    id: ostIdCounter++,
    astNode,
    treeNode,
    scopeItems: treeNode?.items ?? [],
    lets,
    reads,
    writes,
    children: [],
    fnDefOst: null
  }

  astToOst.set(astNode, ost)

  let children = []

  if (astNode.type === 'ForOfStatement' || astNode.type === 'ForInStatement' || astNode.type === 'ForStatement') {
    if (astNode.right)
      children.push(astNode.right)
    if (astNode.left)
      children.push(astNode.left)
    if (astNode.body)
      children.push(astNode.body)
  } else if (astNode.type === 'AssignmentExpression') {
    if (astNode.right)
      children.push(astNode.right)
    if (astNode.left)
      children.push(astNode.left)
  } else {
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
  }

  for (let child of children) {
    let childOst = processAst(child, ost, astToTree, astToOst, indent + '  ', visited)
    if (childOst)
      ost.children.push(childOst)
  }

  return ost
}

function ostAnnotate(ost, astToOst, context) {
  if (!ost)
    return

  for (let letInfo of ost.lets) {
    let writeNode = findFirstWrite(ost, letInfo)
    letInfo.firstWrite = writeNode
    if (!writeNode) {
      context.report({
        node: letInfo.item.identifier,
        messageId: 'mustInit',
        data: { name: letInfo.item.name }
      })
    }
  }

  if (ost.astNode.type === 'CallExpression' && ost.astNode.callee?.type === 'Identifier')
    for (let child of ost.children)
      if (child.astNode === ost.astNode.callee && child.reads.length > 0) {
        let readRef = child.reads[0].item.ref
        if (readRef?.resolved) {
          let variable = readRef.resolved
          if (variable.defs.length > 0) {
            let fnDefAst = variable.defs[0].node
            console.log(`ostAnnotate: callee=${ost.astNode.callee.name}, defs[0].node.type=${fnDefAst.type}`)
            console.log(`ostAnnotate: defs[0].node id=${fnDefAst.id?.name}`)
            if (fnDefAst) {
              ost.fnDefOst = astToOst.get(fnDefAst)
              console.log(`ostAnnotate: fnDefAst=${fnDefAst?.type}, fnDefAst.id.name=${fnDefAst?.id?.name}`)
              console.log(`ostAnnotate: CALL -> fnDefOst ${ost.fnDefOst?.id} (astToOst size=${astToOst.size})`)
              if (!ost.fnDefOst) {
                console.log(`ostAnnotate: WARN - astToOst has keys:`, [...astToOst.keys()].map(k => `${k.type}(${k.id?.name})`))
              }
            }
          }
        }
      }

  for (let child of ost.children)
    ostAnnotate(child, astToOst, context)
}

function findFirstWrite(ost, letInfo) {
  return findFirstWriteInSubtree(ost, letInfo)
}

function findFirstWriteInSubtree(ost, letInfo) {
  if (!ost)
    return null

  for (let writeInfo of ost.writes) {
    let writeVar = writeInfo.item.ref.resolved
    if (writeVar === letInfo.item.variable)
      return ost
  }

  for (let child of ost.children) {
    let result = findFirstWriteInSubtree(child, letInfo)
    if (result)
      return result
  }

  return null
}

function ostCheck(ost, context) {
  if (!ost)
    return

  for (let letInfo of ost.lets)
    if (letInfo.firstWrite)
      walk2Start(ost, letInfo, context)

  for (let child of ost.children)
    ostCheck(child, context)
}

function walk2Start(node, letInfo, context) {
  if (node.astNode.type === 'FunctionDeclaration')
    for (let child of node.children)
      if (child.astNode.type === 'BlockStatement')
        return walk2(child, letInfo, context, new Set())
  return walk2(node, letInfo, context, new Set())
}

function walk2(node, letInfo, context, visited) {
  if (!node)
    return false

  if (node.astNode.type === 'FunctionDeclaration')
    return false

  console.log(`walk2: node=${node.id} ${node.astNode.type}, let=${letInfo.item.name}, firstWrite=${letInfo.firstWrite?.id}`)

  if (node === letInfo.firstWrite) {
    for (let readInfo of node.reads)
      if (readInfo.item.ref.resolved === letInfo.item.variable)
        context.report({
          node: readInfo.item.ref.identifier,
          messageId: 'initBeforeUse',
          data: { name: letInfo.item.name }
        })
    return true
  }

  if (node.astNode.type === 'CallExpression' && node.fnDefOst) {
    let fnVar = node.fnDefOst.astNode.id
    let key = `${letInfo.item.name}:${fnVar.name}`
    console.log(`walk2: CALL ${fnVar.name}, key=${key}, visited=${[...visited]}`)
    if (!visited.has(key)) {
      visited.add(key)
      for (let child of node.fnDefOst.children) {
        console.log(`walk2: checking child ${child.id} ${child.astNode.type}`)
        if (child.astNode.type === 'BlockStatement' && walk2(child, letInfo, context, visited))
          return true
      }
    }
  }

  for (let readInfo of node.reads)
    if (readInfo.item.ref.resolved === letInfo.item.variable)
      context.report({
        node: readInfo.item.ref.identifier,
        messageId: 'initBeforeUse',
        data: { name: letInfo.item.name }
      })

  for (let child of node.children)
    if (walk2(child, letInfo, context, visited))
      return true

  return false
}

function printOst(ost, indent) {
  if (!ost)
    return

  let lets = ost.lets.length ? ` LET:${ost.lets.map(l => `${l.item.name}:${l.item.varId}` + (l.firstWrite ? ` (fw:${l.firstWrite.id})` : ' (no fw)')).join(', ')}` : ''
  let reads = ost.reads.length ? ` READ:${ost.reads.map(r => `${r.item.name}:${r.item.varId}`).join(', ')}` : ''
  let writes = ost.writes.length ? ` WRITE:${ost.writes.map(w => `${w.item.name}:${w.item.varId}`).join(', ')}` : ''
  let fnDef = ost.fnDefOst ? ` fnDefOst:${ost.fnDefOst.id}` : ''
  let extra = lets + reads + writes + fnDef

  let scopeName = ost.treeNode?.scope ? `${ost.treeNode.scope.type}` : 'no-scope'
  if (ost.treeNode?.scope?.block?.id?.name)
    scopeName += `(${ost.treeNode.scope.block.id.name})`

  console.log(`${indent}${ost.id} ${ost.astNode.type} [${scopeName}]${extra}`)

  for (let child of ost.children)
    printOst(child, indent + '  ')
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
