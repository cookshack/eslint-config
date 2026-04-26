function trace
(...args) {
  if (0)
    console.log(...args)
}

function unit
(context) {
  return context.options[0] ?? 2
}

function checkObjectExpressionProperties
(properties, node, context) {
  let firstProp, sourceCode, lastProp, lastPropEnd, closingBrace, firstPropLine, firstPropCol, afterLastProp, closingLine, lastPropValueEndLine

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

  trace('ALGORITHM 1: Single-line objects: always valid (no check needed)')
  trace('CHECK POINT 1: is single-line? firstPropLine=%d, braceLine=%d, closingLine=%d', firstPropLine, node.loc.start.line, closingLine)
  if (firstPropLine == node.loc.start.line && closingLine == firstPropLine)
    return

  trace('ALGORITHM 2: When first property is on a line after {: must use 1 indent unit from the column where { appears')
  trace('CHECK POINT 2: is firstPropLine (%d) != braceLine (%d)?', firstPropLine, node.loc.start.line)
  if (firstPropLine == node.loc.start.line) {
    // first property is on brace line
  }
  else if (firstPropCol == node.loc.start.column + unit(context)) {
    // ok
  }
  else {
    trace('CHECK 2 FAIL')
    context.report({ node: firstProp, messageId: 'indentStruct' })
  }

  trace('ALGORITHM 3: Multi-line: all properties must align to first propertys column')
  trace('CHECK POINT 3: checking property alignment, firstPropCol=%d', firstPropCol)
  for (let i = 1; i < properties.length; i++) {
    let prop

    prop = properties[i]
    if (prop.loc.start.column == firstPropCol) {
      // ok
    }
    else {
      trace('CHECK 3 FAIL')
      context.report({ node: prop, messageId: 'indentStruct' })
    }
  }

  trace('ALGORITHM 4: } on a line following the last prop value must align with {')
  trace('CHECK POINT 4: is closing on a line following last prop value? closingLine=%d, lastPropValueEndLine=%d', closingLine, lastPropValueEndLine)
  if (closingLine > lastPropValueEndLine) {
    let braceCol, closingCol

    braceCol = node.loc.start.column
    closingCol = node.loc.end.column - 1
    trace('CHECK 4: braceCol=%d, closingCol=%d', braceCol, closingCol)
    if (closingCol == braceCol) {
      // ok
    }
    else {
      trace('CHECK 4 FAIL')
      context.report({ node, messageId: 'indentStruct' })
    }
  }

  trace('ALGORITHM 5: } on same line as last prop value must have a space before it')
  trace('CHECK POINT 5: is closing on same line as last prop value? closingLine=%d, lastPropValueEndLine=%d', closingLine, lastPropValueEndLine)
  if (closingLine == lastPropValueEndLine) {
    trace('CHECK 5: lastPropEnd=%d, closingBrace=%d, afterLastProp=%j', lastPropEnd, closingBrace, afterLastProp)
    if (afterLastProp == ' ') {
      // ok
    }
    else {
      trace('CHECK 5 FAIL')
      context.report({ node, messageId: 'indentStruct' })
    }
  }

  trace('ALGORITHM 6: When a param list is on a line after the field name, it must align with the field name')
  trace('CHECK POINT 6: checking method param alignment')
  for (let prop of properties)
    if (prop.method) {
      let keyLine, keyEnd, i, newlines, parenLine

      keyLine = prop.key.loc.start.line
      keyEnd = prop.key.range[1]
      i = keyEnd
      newlines = 0

      while (i < sourceCode.length) {
        if (sourceCode[i] == '(')
          break
        if (sourceCode[i] == '\n')
          newlines++
        i++
      }
      parenLine = keyLine + newlines
      if (parenLine > keyLine) {
        let parenCol

        parenCol = i - sourceCode.lastIndexOf('\n', i)
        if (prop.value.type == 'FunctionExpression' && prop.value.async) {
          // async methods can have whitespace between key and paren
        }
        else if (parenCol - 1 == prop.key.loc.start.column) {
          // ok
        }
        else {
          trace('CHECK 6 FAIL')
          context.report({ node: prop, messageId: 'indentStruct' })
        }
      }
    }
}

function checkObjectExpression
(node, context) {
  let properties

  properties = node.properties
  if (properties.length)
    checkObjectExpressionProperties(properties, node, context)
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
