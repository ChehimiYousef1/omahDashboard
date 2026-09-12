'use strict';

const assert = require('assert');

const {
  buildApplicantSearchQuery,
  escapeRegex,
} = require('../services/applicantSearchService');

assert.strictEqual(
  escapeRegex('a+b@example.com'),
  'a\\+b@example\\.com'
);

const defaults = buildApplicantSearchQuery({});

assert.deepStrictEqual(
  defaults.filter,
  { 'lifecycle.archived': { $ne: true } }
);

assert.strictEqual(defaults.page, 1);
assert.strictEqual(defaults.limit, 50);

const advanced = buildApplicantSearchQuery({
  q: 'Youssef',
  status: 'reviewed',
  positionTrack: 'Backend',
  country: 'Lebanon',
  city: 'Beirut',
  skill: 'Node.js',
  tag: 'priority',
  hasLinkedIn: 'true',
  hasGitHub: 'false',
  appliedFrom: '2026-01-01',
  appliedTo: '2026-12-31',
  sortBy: 'fullName',
  sortOrder: 'asc',
  page: '2',
  limit: '25',
});

assert(advanced.filter.$and);
assert.strictEqual(advanced.page, 2);
assert.strictEqual(advanced.limit, 25);
assert.strictEqual(advanced.skip, 25);
assert.strictEqual(advanced.sort['identity.fullName'], 1);

assert.throws(
  () => buildApplicantSearchQuery({ status: 'invalid-status' }),
  /Unknown applicant status/
);

assert.throws(
  () => buildApplicantSearchQuery({ limit: '1000' }),
  /cannot exceed/
);

assert.throws(
  () => buildApplicantSearchQuery({ sortBy: 'password' }),
  /Unsupported sort field/
);

assert.throws(
  () =>
    buildApplicantSearchQuery({
      appliedFrom: '2026-12-31',
      appliedTo: '2026-01-01',
    }),
  /cannot be after/
);

console.log('✅ safe defaults');
console.log('✅ regex escaping');
console.log('✅ combined filters');
console.log('✅ pagination');
console.log('✅ sort whitelist');
console.log('✅ date validation');
console.log('✅ invalid filters rejected');
console.log('✅ no MongoDB connection used');
console.log('\nPOINT 4 SEARCH SERVICE TEST PASSED');
