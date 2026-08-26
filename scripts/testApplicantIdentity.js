'use strict';

const assert = require('assert');

const {
  normalizeEmail,
  normalizePhone,
  canonicalizeLinkedIn,
} = require('../utils/applicantIdentity');

/*
|--------------------------------------------------------------------------
| Email
|--------------------------------------------------------------------------
*/

assert.strictEqual(
  normalizeEmail(' Test.User@Example.COM '),
  'test.user@example.com'
);

assert.strictEqual(
  normalizeEmail(''),
  ''
);

/*
|--------------------------------------------------------------------------
| Phone
|--------------------------------------------------------------------------
*/

assert.strictEqual(
  normalizePhone('+961 70 123 456'),
  '+96170123456'
);

assert.strictEqual(
  normalizePhone('00961 70 123 456'),
  '+96170123456'
);

assert.strictEqual(
  normalizePhone('70-123-456'),
  '70123456'
);

assert.strictEqual(
  normalizePhone(''),
  ''
);

/*
|--------------------------------------------------------------------------
| LinkedIn
|--------------------------------------------------------------------------
*/

assert.strictEqual(
  canonicalizeLinkedIn(
    'https://www.linkedin.com/in/John-Doe/?trk=profile'
  ),
  'linkedin.com/in/john-doe'
);

assert.strictEqual(
  canonicalizeLinkedIn(
    'linkedin.com/in/john-doe/'
  ),
  'linkedin.com/in/john-doe'
);

assert.strictEqual(
  canonicalizeLinkedIn(
    'https://example.com/in/john-doe'
  ),
  ''
);

assert.strictEqual(
  canonicalizeLinkedIn(''),
  ''
);

console.log('✅ Applicant identity normalization tests passed');
