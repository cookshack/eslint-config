import { buildScopeTree } from './narrowest-scope.js'

let ostIdCounter, errorCount, ost

ostIdCounter = 0
errorCount = 0
ost = 0

function trace
(...args) {
  if (0)
    console.log(...args)
}

export
function lastOst
() {
  return ost
}

function createInitBeforeUse(context) {
  let scopeManager

  scopeManager = context.sourceCode.scopeManager
  if (scopeManager)
    return {
      'Program:exit'() {
        let scopeToNode, astToTree, astToOst

        errorCount = 0
        scopeToNode = new Map
        astToTree = new Map
        astToOst = new Map
        buildScopeTree(scopeManager.scopes[0], '1', scopeToNode, astToTree)

        ostIdCounter = 0
        ost = processAst(context.sourceCode.ast, null, astToTree, astToOst, '', new Set())

        ostAnnotate(ost, astToOst, context)

        ostCheck(ost, context)

        trace('ERRORS: ' + errorCount)
      }
    }
}

function isRegularDeclaration
(item) {
  if (item.type == 'LET') {
    if (item.defType == 'FunctionName' || item.defType == 'Parameter')
      return 0
    return 1
  }
  return 0
}

function processAst(astNode, parentOst, astToTree, astToOst, indent, visited) {
  if (astNode) {
    let treeNode, scopeName, lets, reads, writes, ost, children

    if (visited.has(astNode))
      return
    visited.add(astNode)

    treeNode = astToTree.get(astNode) ?? parentOst?.treeNode

    scopeName = treeNode?.scope ? `${treeNode.scope.type}` : 'no-scope'
    if (treeNode?.scope?.block?.id?.name)
      scopeName += `(${treeNode.scope.block.id.name})`
    trace(`${indent}${astNode.type}`)
    trace(`${indent}  | scope: ${scopeName}`)

    lets = []
    reads = []
    writes = []

    for (let item of treeNode?.items ?? [])
      if (isRegularDeclaration(item)) {
        let scopeCreator

        scopeCreator = treeNode?.scope?.block
        if (scopeCreator && astNode == scopeCreator) {
          lets.push({ item })
          trace(`${indent}  | LET ${item.name}:${item.varId}`)
        }
      }
      else if (item.ref)
        if (astNode == item.ref.identifier)
          if (item.type == 'READ') {
            reads.push({ item })
            trace(`${indent}  | READ ${item.name}:${item.varId}`)
          }
          else if (item.type == 'WRITE') {
            writes.push({ item })
            trace(`${indent}  | WRITE ${item.name}:${item.varId}`)
          }

    ost = {
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

    children = []

    if (astNode.type == 'ForOfStatement' || astNode.type == 'ForInStatement' || astNode.type == 'ForStatement') {
      if (astNode.right)
        children.push(astNode.right)
      if (astNode.left)
        children.push(astNode.left)
      if (astNode.body)
        children.push(astNode.body)
    }
    else if (astNode.type == 'AssignmentExpression') {
      if (astNode.right)
        children.push(astNode.right)
      if (astNode.left)
        children.push(astNode.left)
    }
    else {
      if (astNode.body)
        if (Array.isArray(astNode.body))
          children.push(...astNode.body)
        else
          children.push(astNode.body)
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
      let childOst

      childOst = processAst(child, ost, astToTree, astToOst, indent + '  ', visited)
      if (childOst)
        ost.children.push(childOst)
    }

    return ost
  }
}

function ostAnnotate(ost, astToOst, context) {
  if (ost) {
    for (let letInfo of ost.lets) {
      let writeNode

      writeNode = findFirstWrite(ost, letInfo)
      letInfo.firstWrite = writeNode
      if (writeNode)
        continue
      if (letInfo.item.defType == 'ImportBinding')
        continue
      errorCount++
      context.report({
        node: letInfo.item.identifier,
        messageId: 'mustInit',
        data: { name: letInfo.item.name }
      })
    }

    if (ost.astNode.type == 'CallExpression' && ost.astNode.callee?.type == 'Identifier')
      for (let child of ost.children)
        if (child.astNode == ost.astNode.callee && child.reads.length > 0) {
          let readRef

          readRef = child.reads[0].item.ref
          if (readRef?.resolved) {
            let variable

            variable = readRef.resolved
            if (variable.defs.length > 0) {
              let fnDefAst

              fnDefAst = variable.defs[0].node
              if (fnDefAst) {
                if (fnDefAst.init?.type == 'ArrowFunctionExpression' || fnDefAst.init?.type == 'FunctionExpression')
                  fnDefAst = fnDefAst.init
                ost.fnDefOst = astToOst.get(fnDefAst)
              }
            }
          }
        }

    for (let child of ost.children)
      ostAnnotate(child, astToOst, context)
  }
}

function findFirstWrite(ost, letInfo) {
  return findFirstWriteInSubtree(ost, letInfo)
}

function findFirstWriteInSubtree(ost, letInfo) {
  if (ost) {
    for (let writeInfo of ost.writes) {
      let writeVar

      writeVar = writeInfo.item.ref.resolved
      if (writeVar == letInfo.item.variable)
        return ost
    }

    for (let child of ost.children) {
      let result

      result = findFirstWriteInSubtree(child, letInfo)
      if (result)
        return result
    }
  }

  return null
}

function ostCheck(ost, context) {
  if (ost) {
    for (let letInfo of ost.lets)
      if (letInfo.firstWrite)
        walk2Start(ost, letInfo, context)

    for (let child of ost.children)
      ostCheck(child, context)
  }
}

function walk2Start(node, letInfo, context) {
  if (node.astNode.type == 'FunctionDeclaration')
    for (let child of node.children)
      if (child.astNode.type == 'BlockStatement')
        return walk2(child, letInfo, context, new Set())
  return walk2(node, letInfo, context, new Set())
}

function walk2(node, letInfo, context, visited) {
  if (node) {
    if (node.astNode.type == 'FunctionDeclaration' || node.astNode.type == 'ArrowFunctionExpression' || node.astNode.type == 'FunctionExpression')
      return false

    if (node == letInfo.firstWrite) {
      for (let readInfo of node.reads)
        if (readInfo.item.ref.resolved == letInfo.item.variable) {
          errorCount++
          context.report({
            node: readInfo.item.ref.identifier,
            messageId: 'initBeforeUse',
            data: { name: letInfo.item.name }
          })
        }
      return true
    }

    if (node.astNode.type == 'CallExpression' && node.fnDefOst) {
      let fnType

      fnType = node.fnDefOst.astNode.type

      if (fnType == 'FunctionDeclaration' || fnType == 'ArrowFunctionExpression' || fnType == 'FunctionExpression') {
        let key

        key = `${letInfo.item.name}:${node.fnDefOst.id}`
        if (visited.has(key)) {
        }
        else {
          visited.add(key)
          for (let child of node.fnDefOst.children)
            if (child.astNode.type == 'BlockStatement' && walk2(child, letInfo, context, visited))
              return true
        }
      }
    }

    for (let readInfo of node.reads)
      if (readInfo.item.ref.resolved == letInfo.item.variable) {
        errorCount++
        context.report({
          node: readInfo.item.ref.identifier,
          messageId: 'initBeforeUse',
          data: { name: letInfo.item.name }
        })
      }

    for (let child of node.children)
      if (walk2(child, letInfo, context, visited))
        return true
  }

  return false
}

export
function ostString
(ost, indent) {
  if (ost) {
    let lets, reads, writes, fnDef, extra, scopeName, result

    indent = indent || ''

    lets = ost.lets.length ? ` ${ost.lets.map(l => `LET:${l.item.name}:${l.item.varId}` + (l.firstWrite ? ` (fw:${l.firstWrite.id})` : ' (no fw)')).join(', ')}` : ''
    reads = ost.reads.length ? ` READ:${ost.reads.map(r => `${r.item.name}:${r.item.varId}`).join(', ')}` : ''
    writes = ost.writes.length ? ` WRITE:${ost.writes.map(w => `${w.item.name}:${w.item.varId}`).join(', ')}` : ''
    fnDef = ost.fnDefOst ? ` fnDefOst:${ost.fnDefOst.id}` : ''
    extra = lets + reads + writes + fnDef

    scopeName = ost.treeNode?.scope ? `${ost.treeNode.scope.type}` : 'no-scope'
    if (ost.treeNode?.scope?.block?.id?.name)
      scopeName += `(${ost.treeNode.scope.block.id.name})`

    result = `${indent}${ost.id} ${ost.astNode.type} [${scopeName}]${extra}\n`

    for (let child of ost.children)
      result += ostString(child, indent + '  ')

    return result
  }
  return ''
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
