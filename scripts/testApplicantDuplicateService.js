'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

const {
  buildIdentitySignals,
  compareApplicantIdentity,
  buildDuplicateQuery,
  findDuplicateCandidates,
} = require(
  '../services/applicantDuplicateService'
);

const SOURCE = {
  identity: {
    fullName: 'Test Applicant',
    email:
      ' Test.User@Example.COM ',
    phoneNumber:
      '+961 70 123 456',
  },

  profiles: {
    linkedin:
      'https://www.linkedin.com/in/Test-Applicant/?trk=test',
  },
};

function testNormalization() {
  const result =
    buildIdentitySignals(SOURCE);

  assert.strictEqual(
    result.fullName,
    'test applicant'
  );

  assert.strictEqual(
    result.email,
    'test.user@example.com'
  );

  assert.strictEqual(
    result.phone,
    '+96170123456'
  );

  assert.strictEqual(
    result.linkedin,
    'linkedin.com/in/test-applicant'
  );

  console.log(
    '✅ Identity signals normalized'
  );
}

function testStrongDuplicate() {
  const candidate = {
    identity: {
      fullName:
        'Test Applicant',

      normalizedEmail:
        'test.user@example.com',

      normalizedPhone:
        '+96170123456',
    },

    profiles: {
      linkedinCanonical:
        'linkedin.com/in/another-profile',
    },
  };

  const result =
    compareApplicantIdentity(
      SOURCE,
      candidate
    );

  assert.strictEqual(
    result.isPossibleDuplicate,
    true
  );

  assert.strictEqual(
    result.confidence,
    'high'
  );

  assert.strictEqual(
    result.strongMatchCount,
    2
  );

  assert.deepStrictEqual(
    result.matchedSignals,
    ['email', 'phone']
  );

  console.log(
    '✅ Multiple strong signals = high confidence'
  );
}

function testSingleSignal() {
  const candidate = {
    identity: {
      fullName:
        'Different Person',

      normalizedEmail:
        'test.user@example.com',

      normalizedPhone:
        '+96199999999',
    },

    profiles: {},
  };

  const result =
    compareApplicantIdentity(
      SOURCE,
      candidate
    );

  assert.strictEqual(
    result.isPossibleDuplicate,
    true
  );

  assert.strictEqual(
    result.confidence,
    'possible'
  );

  assert.strictEqual(
    result.strongMatchCount,
    1
  );

  console.log(
    '✅ One strong signal = possible duplicate'
  );
}

function testNameOnly() {
  const candidate = {
    identity: {
      fullName:
        ' Test   Applicant ',

      normalizedEmail:
        'different@example.com',

      normalizedPhone:
        '+96111111111',
    },

    profiles: {
      linkedinCanonical:
        'linkedin.com/in/different',
    },
  };

  const result =
    compareApplicantIdentity(
      SOURCE,
      candidate
    );

  assert.strictEqual(
    result.nameMatches,
    true
  );

  assert.strictEqual(
    result.isPossibleDuplicate,
    false
  );

  assert.strictEqual(
    result.confidence,
    'none'
  );

  console.log(
    '✅ Name-only match does not mark duplicate'
  );
}

function testQuery() {
  const query =
    buildDuplicateQuery(
      SOURCE,
      {
        excludeApplicantId:
          '507f1f77bcf86cd799439011',
      }
    );

  assert.ok(query);

  assert.strictEqual(
    query.$or.length,
    3
  );

  assert.ok(query._id);

  assert.strictEqual(
    query.$or[0][
      'identity.normalizedEmail'
    ],
    'test.user@example.com'
  );

  console.log(
    '✅ Candidate query uses normalized strong signals'
  );
}

function testNoIdentitySignals() {
  const query =
    buildDuplicateQuery({
      identity: {
        fullName:
          'Name Only',
      },
    });

  assert.strictEqual(
    query,
    null
  );

  console.log(
    '✅ No strong identity = no duplicate query'
  );
}

async function testCandidateSearch() {
  let capturedQuery = null;

  const candidates = [
    {
      _id:
        '507f1f77bcf86cd799439012',

      identity: {
        fullName:
          'Test Applicant',

        normalizedEmail:
          'test.user@example.com',

        normalizedPhone:
          '+96170123456',
      },

      profiles: {
        linkedinCanonical:
          'linkedin.com/in/test-applicant',
      },

      lifecycle: {
        archived: false,
      },
    },

    {
      _id:
        '507f1f77bcf86cd799439013',

      identity: {
        fullName:
          'Another Applicant',

        normalizedEmail:
          'test.user@example.com',

        normalizedPhone:
          '+96199999999',
      },

      profiles: {
        linkedinCanonical:
          'linkedin.com/in/different',
      },

      lifecycle: {
        archived: true,
      },
    },
  ];

  const ApplicantModel = {
    find: (query) => {
      capturedQuery = query;

      return {
        select() {
          return {
            lean: async () =>
              candidates,
          };
        },
      };
    },
  };

  const result =
    await findDuplicateCandidates({
      record: SOURCE,

      excludeApplicantId:
        '507f1f77bcf86cd799439011',

      ApplicantModel,
    });

  assert.ok(capturedQuery);

  assert.strictEqual(
    result.length,
    2
  );

  assert.strictEqual(
    result[0].confidence,
    'high'
  );

  assert.strictEqual(
    result[0].strongMatchCount,
    3
  );

  assert.strictEqual(
    result[1].confidence,
    'possible'
  );

  assert.strictEqual(
    result[1].archived,
    true
  );

  console.log(
    '✅ Candidate search returns ranked evidence'
  );

  console.log(
    '✅ Archived candidate remains visible for review'
  );
}

async function run() {
  console.log(
    '================================'
  );

  console.log(
    ' APPLICANT DUPLICATE TEST'
  );

  console.log(
    '================================'
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  testNormalization();
  testStrongDuplicate();
  testSingleSignal();
  testNameOnly();
  testQuery();
  testNoIdentitySignals();

  await testCandidateSearch();

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log('');

  console.log(
    '✅ No MongoDB connection used'
  );

  console.log(
    '✅ No MongoDB writes performed'
  );

  console.log(
    '✅ No automatic merge performed'
  );

  console.log(
    '✅ No Applicant deleted'
  );

  console.log('');

  console.log(
    'TASK 4 TEST PASSED'
  );
}

run().catch((error) => {
  console.error(
    'TASK 4 TEST FAILED'
  );

  console.error(error);

  process.exit(1);
});
