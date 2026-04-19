let varIds, nextVarId, printBuffer

printBuffer = []
varIds = new Map()
nextVarId = 0

function print
(...args) {
  printBuffer.push(args.join(' '))
}

function trace
(...args) {
  if (0)
    console.log('TRACE', ...args)
}

export
function getPrintBuffer
() {
  return printBuffer.join('\n')
}

function clearPrintBuffer
() {
  printBuffer = []
}

function getNarrowestScope
(variable) {
  let common

  common = null
  for (let ref of variable.references) {
    if (variable.defs.some(def => def.name == ref.identifier))
      continue
    if (ref.from)
      if (common)
        common = getCommonAncestor(common, ref.from)
      else
        common = ref.from
  }
  return common
}

function getCommonAncestor
(scope1, scope2) {
  let ancestors, s

  ancestors = []
  s = scope1
  while (s) {
    if (s.type == 'global')
      break
    ancestors.push(s)
    s = s.upper
  }
  s = scope2
  while (s) {
    if (s.type == 'global')
      break
    if (ancestors.includes(s))
      return s
    s = s.upper
  }
  return scope1
}

function getDefinitionScope
(variable) {
  return variable.scope
}

function isWriteRef
(ref) {
  let parent

  parent = ref.identifier.parent
  if (parent) {
    if (parent.type == 'AssignmentExpression' && parent.left == ref.identifier)
      return 1
    if (parent.type == 'UpdateExpression')
      return 1
    if (parent.type == 'VariableDeclarator' && parent.id == ref.identifier)
      return 1
  }
  return 0
}

function isReadRef
(ref) {
  if (isWriteRef(ref))
    return 0
  return 1
}

function getConditionalContext
(ref) {
  let node, prevNode, scopeBlock

  scopeBlock = ref.from.block
  prevNode = ref.identifier
  node = ref.identifier.parent
  while (node) {
    if (node == scopeBlock)
      break
    if (node.type == 'IfStatement')
      if (prevNode == node.test || nodeContains(node.test, prevNode))
        prevNode = node
      else
        return 'B'
    else if ([ 'WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'SwitchStatement' ].includes(node.type))
      if (prevNode == node.test || nodeContains(node.test, prevNode))
        prevNode = node
      else
        return 'B'
    else
      prevNode = node
    node = node.parent
  }
  return ''
}

function nodeContains(node, target) {
  if (node == target)
    return true
  if (node && typeof node == 'object')
    for (let key in node)
      if (nodeHas(node[key], target))
        return true
  return false
}

function nodeHas(value, target) {
  if (value == target)
    return true
  if (Array.isArray(value))
    return value.some(v => nodeContains(v, target))
  return false
}

function hasReadBeforeWriteInNestedScope
(variable, defScope) {
  let nestedFunctions

  nestedFunctions = new Set(variable.references
    .filter(ref => {
      let refScope

      refScope = ref.from
      if (refScope == defScope)
        return 0
      return isProperAncestor(defScope, refScope) && (refScope.type == 'function' || refScope.type == 'arrow')
    })
    .map(ref => ref.from))
  for (let fnScope of nestedFunctions) {
    let fnRefs, hasRead, hasWrite

    fnRefs = variable.references.filter(ref => ref.from == fnScope || isProperAncestor(fnScope, ref.from))
    hasRead = fnRefs.some(ref => isReadRef(ref))
    hasWrite = fnRefs.some(ref => isWriteRef(ref))
    if (hasRead && hasWrite)
      return 1
  }
  return 0
}

function isConditionalRef
(ref, narrowestScope) {
  let node

  node = ref.identifier.parent

  while (node) {
    if (node == narrowestScope.block)
      break
    if (node.type == 'BlockStatement') {
      let parent

      parent = node.parent
      if (parent?.type == 'IfStatement' && (parent.consequent == node || parent.alternate == node))
        return true
      if ([ 'WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement' ].includes(parent?.type) && parent.body == node)
        return true
    }
    node = node.parent
  }
  return false
}

function markConditionalRefs
(variable, scopeToNode, narrowestScope) {
  for (let ref of variable.references) {
    let refNode, rItems, item

    refNode = scopeToNode.get(ref.from)
    rItems = refNode.items.filter(i => i.ref == ref)
    item = rItems[0]
    if (item && (item.ctx == 'B' || isConditionalRef(ref, narrowestScope)))
      item.isConditional = true
  }
}

function mayBeReadBeforeAnyWrite
(variable, scopeToNode, narrowestScope) {
  let refs

  refs = [ ...variable.references ]
  refs.sort((a, b) => (a.cookshackNarrowestScopeItem?.pos ?? a.identifier.range[0]) - (b.cookshackNarrowestScopeItem?.pos ?? b.identifier.range[0]))

  for (let ref of refs) {
    let item

    if (isReadRef(ref))
      return 1

    item = ref.cookshackNarrowestScopeItem
    if (item.ctx == 'B' || isConditionalRef(ref, narrowestScope))
      continue
    return 0
  }
}

function isProperAncestor
(ancestor, descendant) {
  let s

  s = descendant.upper
  while (s) {
    if (s == ancestor)
      return 1
    s = s.upper
  }
  return 0
}

function scopeStart(scope) {
  if (scope.block == null)
    return Infinity
  if (scope.type == 'function' && scope.block.id)
    return scope.block.id.range[1]
  if (scope.type == 'class' && scope.block.id)
    return scope.block.id.range[0]
  return scope.block.range[0]
}

export { isReadRef, isWriteRef, buildScopeTree, scopeStart }

function ensureInVarIds
(variable) {
  if (varIds.has(variable))
    return
  varIds.set(variable, nextVarId++)
}

function isCompoundAssignmentOp
(op) {
  if (op == '=')
    return 0
  return 1
}

function buildScopeTree
(scope, prefix, scopeToNode, astToTree) {
  let node, siblingNum

  node = {
    scope,
    prefix,
    items: [],
    children: []
  }
  scopeToNode.set(scope, node)
  if (scope.block && astToTree)
    astToTree.set(scope.block, node)

  siblingNum = 0
  for (let child of scope.childScopes) {
    siblingNum++
    node.children.push(buildScopeTree(child, prefix + '.' + siblingNum, scopeToNode, astToTree))
  }

  for (let variable of scope.variables) {
    if (variable.defs.length > 0) {
      ensureInVarIds(variable)
      node.items.push({ type: 'LET', name: variable.name, pos: variable.defs[0].name.range[0], defNode: variable.defs[0].node, defType: variable.defs[0].type, identifier: variable.defs[0].name, variable, varId: varIds.get(variable) })
    }

    for (let ref of variable.references) {
      let targetNode

      targetNode = scopeToNode.get(ref.from)
      if (targetNode) {
        let parent, sortPos, ctx, item1, item2

        ctx = getConditionalContext(ref)
        parent = ref.identifier.parent

        if (isWriteRef(ref))
          if (ref.identifier.parent?.type == 'UpdateExpression') {
            item1 = { ref, type: 'READ', name: ref.identifier.name, ctx, pos: ref.identifier.range[0] }
            item2 = { ref, type: 'WRITE', name: ref.identifier.name, pos: ref.identifier.range[0] }
          }
          else if (ref.identifier.parent?.type == 'AssignmentExpression') {
            sortPos = parent.right.range[1] + 0.4
            if (ref.identifier.parent.left === ref.identifier && isCompoundAssignmentOp(ref.identifier.parent.operator)) {
              item1 = { ref, type: 'READ', name: ref.identifier.name, ctx, pos: ref.identifier.range[0] }
              item2 = { ref, type: 'WRITE', name: ref.identifier.name, pos: sortPos }
            }
            else
              item1 = { ref, type: 'WRITE', name: ref.identifier.name, ctx, pos: sortPos }
          }
          else if (ref.identifier.parent?.type == 'VariableDeclarator')
            item1 = { ref, type: 'WRITE', name: ref.identifier.name, pos: ref.identifier.range[0] + 0.4 }
          else
            item1 = { ref, type: 'WRITE', name: ref.identifier.name, pos: ref.identifier.range[0] }
        else {
          let declarator

          declarator = parent
          while (declarator)
            if (declarator.type == 'VariableDeclarator')
              break
            else
              declarator = declarator.parent
          if (declarator?.type == 'VariableDeclarator' && nodeContains(declarator.init, ref.identifier))
            sortPos = declarator.id ? declarator.id.range[0] - 0.4 : ref.identifier.range[0]
          else
            sortPos = ref.identifier.range[0]
          item1 = { ref, type: 'READ', name: ref.identifier.name, ctx, pos: sortPos }
        }
        ensureInVarIds(variable)
        item1.varId = varIds.get(variable)
        targetNode.items.push(item1)
        if (item2) {
          item2.varId = varIds.get(variable)
          targetNode.items.push(item2)
        }
        ref.cookshackNarrowestScopeItem = item2 || item1
      }
    }
  }

  node.items.sort((a, b) => a.pos - b.pos)

  return node
}

function checkScopeNode
(context, treeNode, reported, scopeToNode) {
  let indent

  reported = reported || new Set
  indent = '  '.repeat(treeNode.prefix.split('.').length - 1)

  for (let variable of treeNode.scope.variables) {
    let defNode

    if (reported.has(variable))
      continue
    if (variable.defs.length == 0)
      continue
    if ([ 'Parameter', 'FunctionName', 'ImportBinding', 'CatchClause', 'ClassName' ].includes(variable.defs[0].type))
      continue
    if (variable.defs[0].node.parent?.parent?.type == 'ExportNamedDeclaration')
      continue

    defNode = variable.defs[0]?.name
    if (defNode) {
      let defScope, narrowestScope, defNodePrefix

      defScope = getDefinitionScope(variable)
      defNodePrefix = scopeToNode.get(defScope)?.prefix ?? '?'
      trace(indent, '1 found decl scope of', variable.name + ':', defNodePrefix + ' ' + defScope.type.toUpperCase())

      narrowestScope = getNarrowestScope(variable)
      if (narrowestScope) {
        let narrowestPrefix

        narrowestPrefix = scopeToNode.get(narrowestScope)?.prefix ?? '?'
        trace(indent, '2 found narrowest scope of', variable.name + ':', narrowestPrefix + ' ' + narrowestScope?.type.toUpperCase())

        markConditionalRefs(variable, scopeToNode, narrowestScope)

        if (defScope == narrowestScope)
          continue
        trace(indent, '3', variable.name, 'could be moved to a narrower scope')

        if (defScope.type == 'for') {
          trace(indent, '4 exception:', variable.name, 'is in a for loop header')
          continue
        }
        if (0 && hasReadBeforeWriteInNestedScope(variable, defScope)) {
          trace(indent, '4 exception:', variable.name, 'hasReadBeforeWriteInNestedScope')
          continue
        }
        if (mayBeReadBeforeAnyWrite(variable, scopeToNode, narrowestScope)) {
          trace(indent, '4 exception:', variable.name, 'mayBeReadBeforeAnyWrite')
          continue
        }

        trace(indent, '5', variable.name, 'is too broad')

        reported.add(variable)
        context.report({
          node: defNode,
          messageId: 'tooBroad',
          data: { name: variable.name }
        })
      }
    }
  }

  for (let child of treeNode.children)
    checkScopeNode(context, child, reported, scopeToNode)
}

function printTree
(node, siblingNum) {
  let prefix, all, indent

  prefix = siblingNum == 0 ? node.prefix : node.prefix.split('.').slice(0, -1).join('.') + '.' + siblingNum
  indent = '  '.repeat(prefix.split('.').length - 1)
  {
    let name

    name = node.scope.block?.id?.name ?? node.scope.block?.parent?.key?.name
    print(indent + 'SCOPE ' + prefix + ' ' + node.scope.type.toUpperCase() + ' pos ' + scopeStart(node.scope) + (name ? ' name ' + name : ''))
  }

  all = [ ...node.items.map(i => ({ pos: i.pos, type: 'item', data: i })),
          ...node.children.map((c, i) => ({ pos: scopeStart(c.scope), type: 'scope', data: c, sibling: i + 1 })) ]
  all.sort((a, b) => a.pos - b.pos)

  for (let entry of all)
    if (entry.type == 'item')
      print(indent
            + '  ' + entry.data.type.padEnd(5)
            + ' ' + entry.data.name
            + (entry.data.ctx ? ' ' + entry.data.ctx : '').padEnd(3)
            + (entry.data.isConditional ? 'C' : ' ').padEnd(2)
            + 'pos ' + entry.data.pos)
    else
      printTree(entry.data, entry.sibling)
}

export
function createNarrowestScope
(context) {
  let scopeManager

  clearPrintBuffer()
  scopeManager = context.sourceCode.scopeManager
  if (scopeManager)
    return {
      'Program:exit'() {
        let tree, scopeToNode

        scopeToNode = new Map
        nextVarId = 0
        tree = buildScopeTree(scopeManager.scopes[0], '1', scopeToNode)
        checkScopeNode(context, tree, null, scopeToNode)
        printTree(tree, 0)
      }
    }
}

export
default { meta: { type: 'suggestion',
                  docs: { description: 'Enforce variables are declared in their narrowest possible scope.' },
                  messages: { tooBroad: 'Variable "{{ name }}" is declared in a broader scope than necessary.' },
                  schema: [] },
          create: createNarrowestScope }
