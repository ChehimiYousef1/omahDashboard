'use strict';

const assert = require('assert');

const {
  getApplicantSearchOptions,
  searchApplicants,
} = require('../services/applicantSearchService');

async function main() {
  const calls = {
    findFilter: null,
    countFilter: null,
    sort: null,
    skip: null,
    limit: null,
    distinct: [],
  };

  const queryChain = {
    sort(value) {
      calls.sort = value;
      return this;
    },

    skip(value) {
      calls.skip = value;
      return this;
    },

    limit(value) {
      calls.limit = value;
      return this;
    },

    async lean() {
      return [
        {
          _id: 'applicant-test-1',
          identity: {
            fullName: 'Example Applicant',
          },
        },
      ];
    },
  };

  const distinctValues = {
    'preferences.positionTrack': [
      'Backend',
      'Frontend',
      'Backend',
    ],

    'preferences.positionType': [
      'Internship',
      'Full Time',
    ],

    'identity.country': [
      'Lebanon',
      'Germany',
      'Lebanon',
    ],

    'identity.city': [
      'Beirut',
      'Hamburg',
    ],

    'recruitment.source': [
      'google_form',
      'manual',
    ],

    'recruitment.tags': [
      'priority',
      'graduate',
      'priority',
    ],
  };

  const MockApplicantModel = {
    find(filter) {
      calls.findFilter = filter;
      return queryChain;
    },

    async countDocuments(filter) {
      calls.countFilter = filter;
      return 37;
    },

    async distinct(field, filter) {
      calls.distinct.push({
        field,
        filter,
      });

      return distinctValues[field] || [];
    },
  };

  const result =
    await searchApplicants({
      query: {
        q: 'Example',
        status: 'reviewed',
        country: 'Lebanon',
        page: '2',
        limit: '10',
        sortBy: 'fullName',
        sortOrder: 'asc',
      },

      ApplicantModel:
        MockApplicantModel,
    });

  assert.strictEqual(
    result.applicants.length,
    1
  );

  assert.deepStrictEqual(
    result.pagination,
    {
      page: 2,
      limit: 10,
      total: 37,
      pages: 4,
    }
  );

  assert.strictEqual(
    calls.skip,
    10
  );

  assert.strictEqual(
    calls.limit,
    10
  );

  assert.strictEqual(
    calls.sort['identity.fullName'],
    1
  );

  assert.deepStrictEqual(
    calls.findFilter,
    calls.countFilter
  );

  const options =
    await getApplicantSearchOptions({
      ApplicantModel:
        MockApplicantModel,
    });

  assert.deepStrictEqual(
    options.tracks,
    [
      'Backend',
      'Frontend',
    ]
  );

  assert.deepStrictEqual(
    options.countries,
    [
      'Germany',
      'Lebanon',
    ]
  );

  assert.deepStrictEqual(
    options.tags,
    [
      'graduate',
      'priority',
    ]
  );

  assert(
    options.statuses.includes(
      'applied'
    )
  );

  assert(
    options.statuses.includes(
      'reviewed'
    )
  );

  assert(
    options.sortFields.includes(
      'lastActivityAt'
    )
  );

  assert.strictEqual(
    calls.distinct.length,
    6
  );

  for (const call of calls.distinct) {
    assert.deepStrictEqual(
      call.filter,
      {
        'lifecycle.archived': {
          $ne: true,
        },
      }
    );
  }

  console.log(
    '✅ searchApplicants execution'
  );

  console.log(
    '✅ pagination calculation'
  );

  console.log(
    '✅ find/count filter consistency'
  );

  console.log(
    '✅ sorting + skip + limit'
  );

  console.log(
    '✅ search option normalization'
  );

  console.log(
    '✅ options limited to active applicants'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nPOINT 4 EXECUTION TEST PASSED'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
