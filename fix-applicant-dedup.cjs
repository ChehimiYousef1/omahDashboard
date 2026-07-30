/* =============================================================================
 *  Applicant sync — fix the dedup key and clean up the duplicates it created
 *
 *  Usage:  node scripts/fix-applicant-dedup.cjs           <- DRY RUN
 *          node scripts/fix-applicant-dedup.cjs --apply
 *
 *  The bug: syncIdentifier was `email_YYYY-MM-DD`, and rows whose sheet
 *  timestamp is missing fall back to `new Date()` — today. So every calendar
 *  day produced a brand-new key for the same person and re-imported them.
 *
 *  The fix: key on email + jobTitle, which never changes.
 *    Phase 1  patch applicationStore.js
 *    Phase 2  rebuild syncIdentifier on existing docs, drop duplicates
 *             (oldest record of each pair survives), add a unique index
 * ========================================================================== */
require('dotenv').config();
const fs = require('fs');

const APPLY = process.argv.includes('--apply');
const say = (s) => console.log('  ' + s);

console.log(APPLY ? '>>> APPLYING' : '>>> DRY RUN — add --apply to make changes');

/* ------------------------------------------------ PHASE 1: patch the code */
console.log('\n=== Phase 1: applicationStore.js ===');

const F = 'applicationStore.js';
let src = fs.readFileSync(F, 'utf8');
const original = src;

const HELPER =
  'function buildSyncIdentifier(email, jobTitle) {\n' +
  "  return String(email).toLowerCase().trim() + '::' + String(jobTitle || '').toLowerCase().trim();\n" +
  '}\n\n';

const edits = [
  [
    'async function findDuplicate(email, appliedDate) {',
    HELPER + 'async function findDuplicate(email, appliedDate, jobTitle) {',
  ],
  [
    '    return Application.findOne({\n' +
      '      email: normalizedEmail,\n' +
      '      syncIdentifier: `${normalizedEmail}_${dateStr}`,\n' +
      '    });',
    '    return Application.findOne({ syncIdentifier: buildSyncIdentifier(normalizedEmail, jobTitle) });',
  ],
  [
    '  return apps.find(\n' +
      '    (app) =>\n' +
      '      app.userEmail.toLowerCase() === normalizedEmail &&\n' +
      '      app.appliedDate === dateStr\n' +
      '  ) || null;',
    '  return apps.find(\n' +
      '    (app) =>\n' +
      "      String(app.userEmail || '').toLowerCase() === normalizedEmail &&\n" +
      "      String(app.jobTitle || '').toLowerCase().trim() ===\n" +
      "        String(jobTitle || '').toLowerCase().trim()\n" +
      '  ) || null;',
  ],
  [
    '  const duplicate = await findDuplicate(email, appliedDate);',
    '  const duplicate = await findDuplicate(email, appliedDate, rowData.jobTitle);',
  ],
  [
    '    const syncIdentifier = `${email}_${dateStr}`;',
    '    const syncIdentifier = buildSyncIdentifier(email, rowData.jobTitle);',
  ],
];

let applied = 0;
for (const [from, to] of edits) {
  if (src.includes(from)) {
    src = src.replace(from, to);
    applied++;
    say('ok       ' + from.split('\n')[0].trim().slice(0, 62));
  } else {
    say('NO MATCH ' + from.split('\n')[0].trim().slice(0, 62));
  }
}
say(`${applied}/${edits.length} edits`);

if (APPLY && applied === edits.length) {
  fs.writeFileSync(F + '.bak', original);
  fs.writeFileSync(F, src);
  say('written (backup: ' + F + '.bak)');
} else if (APPLY) {
  console.error('\n  Some edits did not match — nothing written. Patch by hand.');
  process.exit(1);
}

/* --------------------------------------------- PHASE 2: clean the database */
(async () => {
  console.log('\n=== Phase 2: MongoDB ===');
  const { MongoClient } = require('mongodb');
  const uri = process.env.MONGODB_URI;
  if (!uri || process.env.DISABLE_MONGO === 'true') { say('Mongo disabled — skipping'); return; }

  const client = await MongoClient.connect(uri);
  const col = client.db().collection('applications');

  const before = await col.countDocuments();
  say('documents before: ' + before);

  const docs = await col.find({}, { projection: { email: 1, jobTitle: 1, createdAt: 1 } }).toArray();
  const keyOf = (d) =>
    String(d.email || '').toLowerCase().trim() + '::' + String(d.jobTitle || '').toLowerCase().trim();

  const seen = new Map();
  const toDelete = [];
  docs
    .slice()
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb || String(a._id).localeCompare(String(b._id));
    })
    .forEach((d) => {
      const k = keyOf(d);
      if (seen.has(k)) toDelete.push(d._id);
      else seen.set(k, d._id);
    });

  say('unique applicants (email + job): ' + seen.size);
  say('duplicates to remove: ' + toDelete.length);

  if (!APPLY) {
    say('would end with: ' + (before - toDelete.length) + ' documents');
    await client.close();
    console.log('\n  Nothing changed. Re-run with --apply.');
    return;
  }

  if (toDelete.length) {
    const r = await col.deleteMany({ _id: { $in: toDelete } });
    say('deleted: ' + r.deletedCount);
  }

  let rebuilt = 0;
  for (const [k, id] of seen) {
    await col.updateOne({ _id: id }, { $set: { syncIdentifier: k } });
    rebuilt++;
  }
  say('syncIdentifier rebuilt on ' + rebuilt + ' documents');

  try {
    await col.dropIndex('syncIdentifier_1');
  } catch (_) { /* no such index — fine */ }
  await col.createIndex({ syncIdentifier: 1 }, { unique: true, sparse: true });
  say('unique index on syncIdentifier created — duplicates now impossible');

  say('documents after: ' + (await col.countDocuments()));
  await client.close();

  console.log(`
  Now:
     npm start          <- must print "imported 0 new applicant(s)"
     npm start          <- run it twice; still 0
  Revert code with:  mv ${F}.bak ${F}
`);
})().catch((e) => { console.error(e); process.exit(1); });
