#!/usr/bin/env node
/* =============================================================================
 *  server.js  ->  src/routes/*.routes.js      (automatic, no copy-paste)
 *
 *  Usage:  node scripts/split-routes.cjs           <- DRY RUN, writes nothing
 *          node scripts/split-routes.cjs --apply   <- performs the split
 *
 *  How it stays safe:
 *   - Every route block is lifted whole (from `app.method(` to the matching
 *     `});` at column 0). Handler bodies are NEVER rewritten.
 *   - Helper functions, transporter, db, constants: all stay in server.js.
 *     Each route module is a factory that receives them as `deps`, so nothing
 *     changes scope. The script works out which names each module actually
 *     uses and destructures only those.
 *   - Mounts are inserted just before the SPA catch-all, so every helper is
 *     already defined by then.
 *   - server.js.before-split is written as a backup.
 * ========================================================================== */
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const SRC = 'server.js';
const OUTDIR = path.join('src', 'routes');

if (!fs.existsSync(SRC)) { console.error('Run from the project root (server.js not found)'); process.exit(1); }

const text = fs.readFileSync(SRC, 'utf8');
const lines = text.split('\n');

/* ---------------------------------------------------- 1. find route blocks */
const ROUTE = /^app\.(get|post|put|patch|delete)\(\s*(['"])([^'"]+)\2/;
const END = /^\}\);\s*$/;

const blocks = [];
let catchAllLine = -1;

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(ROUTE);
  if (!m) {
    if (/^app\.get\(\s*\/\.\*\//.test(lines[i]) && catchAllLine === -1) catchAllLine = i;
    continue;
  }
  const url = m[3];
  if (!url.startsWith('/api/')) continue;
  let j = i;
  while (j < lines.length && !END.test(lines[j])) j++;
  if (j >= lines.length) { console.error(`Unterminated block at line ${i + 1}`); process.exit(1); }
  blocks.push({ start: i, end: j, method: m[1], url, group: url.split('/')[2] });
  i = j;
}

if (!blocks.length) { console.error('No /api routes found — already split?'); process.exit(1); }

/* --------------------------------------- 2. top-level names defined in server.js */
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

/* ------------------------------------------------------------- 3. group them */
const groups = new Map();
for (const b of blocks) {
  if (!groups.has(b.group)) groups.set(b.group, []);
  groups.get(b.group).push(b);
}

console.log(APPLY ? '>>> APPLYING' : '>>> DRY RUN — add --apply to write files');
console.log(`\nfound ${blocks.length} routes in ${groups.size} groups\n`);

const mounts = [];
const files = [];

for (const [group, gblocks] of groups) {
  const body = gblocks.map(b => {
    const raw = lines.slice(b.start, b.end + 1).join('\n');
    const sub = b.url.slice(`/api/${group}`.length) || '/';
    return raw.replace(ROUTE, `router.${b.method}('${sub}'`);
  }).join('\n\n');

  const used = [...topNames].filter(n => new RegExp(`\\b${n.replace(/\$/g, '\\$')}\\b`).test(body)).sort();

  const file = `const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { ${used.join(', ')} } = deps;

${body.split('\n').map(l => (l ? '  ' + l : l)).join('\n')}

  return router;
};
`;
  files.push([path.join(OUTDIR, `${group}.routes.js`), file]);
  mounts.push(`app.use('/api/${group}', require('./src/routes/${group}.routes')({ ${used.join(', ')} }));`);

  console.log(`  ${group.padEnd(14)} ${String(gblocks.length).padStart(2)} routes   deps: ${used.join(', ') || '(none)'}`);
}

/* ------------------------------------------------- 4. rebuild server.js */
const drop = new Set();
blocks.forEach(b => { for (let k = b.start; k <= b.end; k++) drop.add(k); });

const out = [];
for (let i = 0; i < lines.length; i++) {
  if (i === catchAllLine) {
    out.push('/* ---- API routes (extracted into src/routes/) ---- */');
    out.push(...mounts);
    out.push('');
  }
  if (!drop.has(i)) out.push(lines[i]);
}

if (catchAllLine === -1) {
  console.log('\n  ! SPA catch-all not found — mounts appended at the end instead');
  out.push('', '/* ---- API routes ---- */', ...mounts);
}

console.log(`\n  server.js: ${lines.length} -> ${out.length} lines`);

if (!APPLY) {
  console.log('\n  Nothing written. Re-run with --apply when this looks right.');
  process.exit(0);
}

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(`${SRC}.before-split`, text);
for (const [p, c] of files) { fs.writeFileSync(p, c); console.log(`  wrote ${p}`); }
fs.writeFileSync(SRC, out.join('\n'));

console.log(`
  Backup: ${SRC}.before-split

  Verify NOW, before anything else:
     npm start
     curl -s -o /dev/null -w "%{http_code}\\n" http://localhost:5000/api/posts

  If it breaks:  mv ${SRC}.before-split ${SRC}
`);
