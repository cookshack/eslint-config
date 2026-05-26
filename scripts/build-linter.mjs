import { readFileSync, writeFileSync } from 'node:fs'

let src = readFileSync(
  'node_modules/eslint-linter-browserify/linter.mjs',
  'utf8',
)

// Patch 1: FunctionDeclaration.body and FunctionExpression.body schema
//   token: body: {<tabs>type: "integer",<tabs>minimum: 0,<tabs>},
const schemaOld =
  '\t\t\t\t\t\t\t\tbody: {\n' +
  '\t\t\t\t\t\t\t\t\ttype: "integer",\n' +
  '\t\t\t\t\t\t\t\t\tminimum: 0,\n' +
  '\t\t\t\t\t\t\t\t},'

const schemaNew =
  '\t\t\t\t\t\t\t\tbody: {\n' +
  '\t\t\t\t\t\t\t\t\toneOf: [\n' +
  '\t\t\t\t\t\t\t\t\t\t{ type: "integer", minimum: 0 },\n' +
  '\t\t\t\t\t\t\t\t\t\t{ enum: ["keyword"] },\n' +
  '\t\t\t\t\t\t\t\t\t],\n' +
  '\t\t\t\t\t\t\t\t},'

let count = 0
src = src.replaceAll(schemaOld, s => { count++; return schemaNew })
console.error(`Schema patches: ${count}`)

// Patch 2: Insert body: 'keyword' handler in BlockStatement
const handlerAnchor =
  '\t\t\t\t\tblockIndentLevel = 1;\n' +
  '\t\t\t\t\t}\n' +
  '\n' +
  '\t\t\t\t\t/*'

const handlerCode = [
  '',
  '\t\t\t\t\tif ((node.parent && node.parent.type === "FunctionDeclaration" && options.FunctionDeclaration.body === "keyword") ||',
  '\t\t\t\t\t\t(node.parent && (node.parent.type === "FunctionExpression" || node.parent.type === "ArrowFunctionExpression") && options.FunctionExpression.body === "keyword")) {',
  '\t\t\t\t\t\tconst fnKeyword = sourceCode.getFirstToken(node.parent);',
  '\t\t\t\t\t\tconst openBrace = sourceCode.getFirstToken(node);',
  '\t\t\t\t\t\tconst closeBrace = sourceCode.getLastToken(node);',
  '',
  '\t\t\t\t\t\toffsets.setDesiredOffset(fnKeyword, undefined,',
  '\t\t\t\t\t\t\tfnKeyword.loc.start.column / indentSize);',
  '',
  '\t\t\t\t\t\toffsets.setDesiredOffsets(',
  '\t\t\t\t\t\t\t[openBrace.range[1], closeBrace.range[0]],',
  '\t\t\t\t\t\t\tfnKeyword,',
  '\t\t\t\t\t\t\ttypeof blockIndentLevel === "number" ?',
  '\t\t\t\t\t\t\t\tblockIndentLevel :',
  '\t\t\t\t\t\t\t\t1,',
  '\t\t\t\t\t\t);',
  '\t\t\t\t\t\toffsets.setDesiredOffset(closeBrace, fnKeyword, 0);',
  '\t\t\t\t\t\treturn;',
  '\t\t\t\t\t}',
  '',
  '\t\t\t\t\t/*',
].join('\n')

const handlerReplacement =
  '\t\t\t\t\tblockIndentLevel = 1;\n' +
  '\t\t\t\t\t}\n' +
  '\n' +
  handlerCode

if (!src.includes(handlerAnchor)) {
  console.error('ERROR: could not find BlockStatement handler anchor')
  process.exit(1)
}
src = src.replace(handlerAnchor, handlerReplacement)
console.error('Handler patch: applied')

writeFileSync('dist/eslint-linter.mjs', src)
console.error('Wrote dist/eslint-linter.mjs')
