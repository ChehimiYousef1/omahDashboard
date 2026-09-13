'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const mongoose =
  require('mongoose');

const swagger =
  require('../docs/applicantSwagger');


function read(relativePath) {
  return fs.readFileSync(
    path.join(
      __dirname,
      '..',
      relativePath
    ),
    'utf8'
  );
}


function run() {
  console.log(
    '================================'
  );

  console.log(
    ' TASK 6 HISTORY CONTRACT TEST'
  );

  console.log(
    '================================'
  );

  const routeSource =
    read(
      'src/routes/applicants.routes.js'
    );

  const permissionSource =
    read(
      'utils/applicantPermissions.js'
    );

  assert.ok(
    permissionSource.includes(
      "'applicant:submissions:view'"
    )
  );

  assert.ok(
    routeSource.includes(
      "requireApplicantPermission(\n      'applicant:submissions:view'"
    )
  );

  const historyPath =
    swagger.paths[
      '/api/applicants/{id}/submissions'
    ];

  assert.ok(historyPath);
  assert.ok(historyPath.get);

  const response =
    historyPath
      .get
      .responses[200];

  assert.strictEqual(
    response.content[
      'application/json'
    ].schema.$ref,
    '#/components/schemas/ApplicantSubmissionHistoryResponse'
  );

  const schemas =
    swagger.components.schemas;

  [
    'ApplicantSubmissionChangedField',
    'ApplicantSubmissionComparison',
    'ApplicantSubmissionHistoryItem',
    'ApplicantSubmissionHistorySummary',
    'ApplicantSubmissionHistoryResponse',
  ].forEach(
    (schemaName) => {
      assert.ok(
        schemas[schemaName],
        `Missing Swagger schema: ${schemaName}`
      );
    }
  );

  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log(
    '✅ submission history permission registered'
  );

  console.log(
    '✅ submission history route permission protected'
  );

  console.log(
    '✅ history response schema documented'
  );

  console.log(
    '✅ comparison schema documented'
  );

  console.log(
    '✅ summary schema documented'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no MongoDB writes performed'
  );

  console.log('');
  console.log(
    'TASK 6.6 / 6.7 CONTRACT TEST PASSED'
  );
}


try {
  run();
} catch (error) {
  console.error(
    '❌ TASK 6 HISTORY CONTRACT TEST FAILED'
  );

  console.error(error);

  process.exit(1);
}
