const fs = require('fs');
const repl = [
  [/ \uFFFD\?" /g, ' - '],
  [/\uFFFD\?" /g, '- '],
  [/\uFFFD\?"/g, '-'],
  [/\u2014/g, '-'],
  [/\u2013/g, '-'],
];
for (const f of ['client/src/pages/admin/Payroll.jsx','client/src/services/api.js']) {
  let c = fs.readFileSync(f,'utf8');
  for (const [a,b] of repl) c = c.replace(a,b);
  // specific leftovers
  c = c.replace('Date.now() - hit.at', 'Date.now() - hit.at'); // noop ensure
  fs.writeFileSync(f,c,'utf8');
}
console.log('done');
