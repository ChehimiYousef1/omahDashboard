const fs = require('fs');
const path = require('path');
const APPLY = process.argv.includes('--apply');
const SRC = 'server.js';
const OUTDIR = path.join('src', 'routes');
if (!fs.existsSync(SRC)) { console.error('Run from project root'); process.exit(1); }
const text = fs.readFileSync(SRC, 'utf8');
const lines = text.split('\n');
const ROUTE = /^app\.(get|post|put|patch|delete)\(\s*(['"])([^'"]+)\2/;
const END = /^\}\);\s*$/;
const blocks = [];
let catchAllLine = -1;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(ROUTE);
  if (!m) { if (/^app\.get\(\s*\/\.\*\//.test(lines[i]) && catchAllLine === -1) catchAllLine = i; continue; }
  const url = m[3];
  if (!url.startsWith('/api/')) continue;
  let j = i;
  while (j < lines.length && !END.test(lines[j])) j++;
  if (j >= lines.length) { console.error('Unterminated block at line ' + (i+1)); process.exit(1); }
  blocks.push({ start: i, end: j, method: m[1], url, group: url.split('/')[2] });
  i = j;
}
if (!blocks.length) { console.error('No /api routes found'); process.exit(1); }
const inBlock = new Set();
blocks.forEach(b => { for (let k = b.start; k <= b.end; k++) inBlock.add(k); });
const DECL = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=|^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^const\s*\{([^}]+)\}\s*=/;
const topNames = new Set();
lines.forEach((ln, i) => {
  if (inBlock.has(i)) return;
  const m = ln.match(DECL);
  if (!m) return;
  if (m[1]) topNames.add(m[1]);
  if (m[2]) topNames.add(m[2]);
  if (m[3]) m[3].split(',').forEach(p => {
    const n = p.split(':').pop().trim().replace(/\s*=.*$/, '');
    if (/^[A-Za-z_$][\w$]*$/.test(n)) topNames.add(n);
  });
});
topNames.delete('app');
const groups = new Map();
for (const b of blocks) { if (!groups.has(b.group)) groups.set(b.group, []); groups.get(b.group).push(b); }
console.log(APPLY ? '>>> APPLYING' : '>>> DRY RUN — add --apply to write files');
console.log('\nfound ' + blocks.length + ' routes in ' + groups.size + ' groups\n');
const mounts = [];
const files = [];
for (const [group, gblocks] of groups) {
  const body = gblocks.map(b => {
    const raw = lines.slice(b.start, b.end + 1).join('\n');
    const sub = b.url.slice(('/api/' + group).length) || '/';
    return raw.replace(ROUTE, "router." + b.method + "('" + sub + "'");
  }).join('\n\n');
  const used = [...topNames].filter(n => new RegExp('\\b' + n.replace(/\$/g, '\\$') + '\\b').test(body)).sort();
  const file = "const express = require('express');\n\nmodule.exports = (deps) => {\n  const router = express.Router();\n  const { " + used.join(', ') + " } = deps;\n\n" + body.split('\n').map(l => (l ? '  ' + l : l)).join('\n') + "\n\n  return router;\n};\n";
  files.push([path.join(OUTDIR, group + '.routes.js'), file]);
  mounts.push("app.use('/api/" + group + "', require('./src/routes/" + group + ".routes')({ " + used.join(', ') + " }));");
  console.log('  ' + group.padEnd(14) + String(gblocks.length).padStart(2) + ' routes   deps: ' + (used.join(', ') || '(none)'));
}
const drop = new Set();
blocks.forEach(b => { for (let k = b.start; k <= b.end; k++) drop.add(k); });
const out = [];
for (let i = 0; i < lines.length; i++) {
  if (i === catchAllLine) { out.push('/* ---- API routes (extracted into src/routes/) ---- */'); out.push(...mounts); out.push(''); }
  if (!drop.has(i)) out.push(lines[i]);
}
if (catchAllLine === -1) { console.log('\n  ! catch-all not found — mounts appended at end'); out.push('', '/* ---- API routes ---- */', ...mounts); }
console.log('\n  server.js: ' + lines.length + ' -> ' + out.length + ' lines');
if (!APPLY) { console.log('\n  Nothing written. Re-run with --apply.'); process.exit(0); }
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(SRC + '.before-split', text);
for (const [p, c] of files) { fs.writeFileSync(p, c); console.log('  wrote ' + p); }
fs.writeFileSync(SRC, out.join('\n'));
console.log('\n  Backup: ' + SRC + '.before-split\n  Verify: npm start\n  Revert: mv ' + SRC + '.before-split ' + SRC + '\n');
