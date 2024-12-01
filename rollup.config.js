export default [ { input: 'index.js',
                   output: [ { file: './dist/index.js', format: 'es' },
                             { file: './dist/index.cjs', format: 'cjs' } ],
                   external: [ 'globals' ] },
                 { input: 'formatter.js',
                   output: [ { file: './dist/formatter.js', format: 'es' },
                             { file: './dist/formatter.cjs', format: 'cjs' } ],
                   external: [ 'globals' ] } ]
