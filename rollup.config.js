export default [ { input: 'index.js',
                   output: [ { file: './dist/index.js',
                               format: 'es',
                               exports: 'named' }, // silence warning about mixing exports.
                             { file: './dist/index.cjs',
                               format: 'cjs',
                               exports: 'named' } ], // silence warning about mixing exports.
                   external: [ 'globals' ] },
                 { input: 'formatter.js',
                   output: [ { file: './dist/formatter.js', format: 'es' },
                             { file: './dist/formatter.cjs', format: 'cjs' } ],
                   external: [ 'globals' ] } ]
