'use strict';

const assert =
  require('assert');

const reportSwagger =
  require(
    '../docs/applicantReportSwagger'
  );

const {
  buildApplicantSwaggerSpec,
} = require(
  '../src/bootstrap/registerSwagger'
);


const path =
  '/api/applicants/{applicantId}/reports/summary.pdf';

assert.ok(
  reportSwagger
    .paths[path]
    ?.get
);

assert.deepStrictEqual(
  reportSwagger
    .paths[path]
    .get
    .tags,
  [
    'Applicant Reports & Export',
  ]
);

assert.ok(
  reportSwagger
    .paths[path]
    .get
    .responses
    [200]
    .content
    ['application/pdf']
);

assert.strictEqual(
  reportSwagger
    .paths[path]
    .get
    .responses
    [200]
    .content
    ['application/pdf']
    .schema
    .format,
  'binary'
);

const merged =
  buildApplicantSwaggerSpec();

assert.ok(
  merged
    .paths[path]
    ?.get,
  'Report Swagger not merged into Applicant spec'
);

assert.ok(
  (
    merged.tags ||
    []
  ).some(
    tag =>
      tag.name ===
      'Applicant Reports & Export'
  )
);

console.log(
  '✅ Applicant Summary PDF documented'
);

console.log(
  '✅ application/pdf binary response documented'
);

console.log(
  '✅ Applicant Reports & Export Swagger group'
);

console.log(
  '✅ report Swagger merged into /api-docs'
);

console.log(
  '\nAPPLICANT REPORT SWAGGER TEST PASSED'
);
