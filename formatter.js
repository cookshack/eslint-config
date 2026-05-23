export default
function
(results) {
  let str

  function add
  (m, result) {
    str += (result.filePath + ':' + m.line + ':' + m.column + ': ' + m.message + ' (' + m.messageId + ', ' + m.ruleId + ')\n')
    //str += 'test' //result.filePath + '\n'
    //str += '\n'
  }

  str = ''
  results.forEach(result => result.messages.forEach(m => add(m, result)))
  return str
  //return 'test'
  //return JSON.stringify(results, null, 2)
}
