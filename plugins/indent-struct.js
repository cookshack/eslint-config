function checkObjectExpression
(node, context) {
  let properties, firstProp, sourceCode, lastProp, lastPropEnd, closingBrace, firstPropLine, firstPropCol, afterLastProp, closingLine, lastPropValueEndLine

  properties = node.properties
  if (properties.length === 0)
    return

  sourceCode = context.sourceCode.text
  firstProp = properties[0]
  lastProp = properties[properties.length - 1]
  firstPropLine = firstProp.loc.start.line
  firstPropCol = firstProp.loc.start.column
  lastPropEnd = lastProp.range[1]
  closingBrace = sourceCode.indexOf('}', lastPropEnd)
  closingLine = sourceCode.slice(0, closingBrace).split('\n').length
  afterLastProp = sourceCode.slice(lastPropEnd, closingBrace)
  lastPropValueEndLine = sourceCode.slice(0, lastPropEnd).split('\n').length

  console.log('CHECK POINT 1: is single-line? firstPropLine=%d, braceLine=%d, closingLine=%d', firstPropLine, node.loc.start.line, closingLine)
  if (firstPropLine == node.loc.start.line && closingLine == firstPropLine)
    return

  console.log('CHECK POINT 2: is firstPropLine (%d) != braceLine (%d)?', firstPropLine, node.loc.start.line)
  if (firstPropLine != node.loc.start.line) {
    if (firstPropCol != node.loc.start.column + 2)
      context.report({ node: firstProp, messageId: 'indentStruct' })
  }

  console.log('CHECK POINT 3: checking property alignment, firstPropCol=%d', firstPropCol)
  for (let i = 1; i < properties.length; i++) {
    let prop = properties[i]
    if (prop.loc.start.column != firstPropCol)
      context.report({ node: prop, messageId: 'indentStruct' })
  }

  console.log('CHECK POINT 4: is closing on a line following last prop value? closingLine=%d, lastPropValueEndLine=%d', closingLine, lastPropValueEndLine)
  if (closingLine > lastPropValueEndLine) {
    if (afterLastProp.trim() != '}')
      context.report({ node, messageId: 'indentStruct' })
  }

  console.log('CHECK POINT 5: is closing on same line as last prop value? closingLine=%d, lastPropValueEndLine=%d', closingLine, lastPropValueEndLine)
  if (closingLine == lastPropValueEndLine) {
    if (!afterLastProp.trimEnd().endsWith(' }'))
      context.report({ node, messageId: 'indentStruct' })
  }
}

function create
(context) {
  return { ObjectExpression: node => checkObjectExpression(node, context) }
}

export default { meta: { type: 'suggestion',
                          docs: { description: 'Struct alignment rules.' },
                          messages: { indentStruct: 'Indent structure' },
                          schema: [] },
                  create }
