const fs = require('fs');
const code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const stack = [];
const lines = code.split('\n');
for(let i=0; i<lines.length; i++) {
  let line = lines[i];
  for(let j=0; j<line.length; j++) {
    if (line[j] === '(' || line[j] === '{') stack.push({char: line[j], line: i+1});
    if (line[j] === ')' || line[j] === '}') {
      let match = line[j] === ')' ? '(' : '{';
      if (stack[stack.length-1].char === match) {
        stack.pop();
      } else {
        console.log(`Mismatch at line ${i+1}: expected ${match === '(' ? ')' : '}'} to match ${stack[stack.length-1].char} at line ${stack[stack.length-1].line}`);
        process.exit(1);
      }
    }
  }
}
stack.forEach(item => console.log(`Unclosed ${item.char} at line ${item.line}`));
