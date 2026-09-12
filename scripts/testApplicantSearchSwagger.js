'use strict';

const assert = require('assert');

const swagger =
  require('../docs/applicantSwagger');

const listOperation =
  swagger.paths[
    '/api/applicants'
  ]?.get;

assert(
  listOperation,
  'GET /api/applicants missing from Swagger'
);

const actualParameters =
  (listOperation.parameters || [])
    .map((parameter) =>
      parameter.name
    )
    .sort();

const expectedParameters = [
  'q',
  'status',
  'positionTrack',
  'positionType',
  'country',
  'city',
  'source',
  'assignedRecruiterId',
  'skill',
  'tag',
  'hasLinkedIn',
  'hasGitHub',
  'appliedFrom',
  'appliedTo',
  'archived',
  'sortBy',
  'sortOrder',
  'page',
  'limit',
].sort();

assert.deepStrictEqual(
  actualParameters,
  expectedParameters
);

const archivedParameter =
  listOperation.parameters.find(
    (parameter) =>
      parameter.name === 'archived'
  );

assert.deepStrictEqual(
  archivedParameter.schema.enum,
  [
    'false',
    'true',
    'all',
  ]
);

const limitParameter =
  listOperation.parameters.find(
    (parameter) =>
      parameter.name === 'limit'
  );

assert.strictEqual(
  limitParameter.schema.maximum,
  200
);

const sortParameter =
  listOperation.parameters.find(
    (parameter) =>
      parameter.name === 'sortBy'
  );

assert(
  sortParameter.schema.enum.includes(
    'lastActivityAt'
  )
);

assert(
  sortParameter.schema.enum.includes(
    'fullName'
  )
);

const optionsOperation =
  swagger.paths[
    '/api/applicants/search-options'
  ]?.get;

assert(
  optionsOperation,
  'GET /api/applicants/search-options missing from Swagger'
);

console.log(
  '✅ all advanced search parameters documented'
);

console.log(
  '✅ archive lifecycle options documented'
);

console.log(
  '✅ pagination limit documented'
);

console.log(
  '✅ sort whitelist documented'
);

console.log(
  '✅ search-options endpoint documented'
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '\nPOINT 4 SWAGGER TEST PASSED'
);
