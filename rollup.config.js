export default {
  input: 'index.js',
  output: [ { file: './dist/index.js', format: 'es' },
            { file: './dist/index.cjs', format: 'cjs' } ],
  external: [ 'globals' ]
}
