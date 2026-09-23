'use strict';

const assert =
  require('assert');

const talentPoolSwagger =
  require(
    '../docs/applicantTalentPoolSwagger'
  );

const {
  buildApplicantSwaggerSpec,
} =
  require(
    '../src/bootstrap/registerSwagger'
  );


const operations = [
  [
    '/api/applicants/talent-pool/categories',
    'get',
  ],

  [
    '/api/applicants/talent-pool/categories',
    'post',
  ],

  [
    '/api/applicants/talent-pool/categories/{categoryId}',
    'get',
  ],

  [
    '/api/applicants/talent-pool/categories/{categoryId}',
    'put',
  ],

  [
    '/api/applicants/talent-pool/categories/{categoryId}',
    'patch',
  ],

  [
    '/api/applicants/talent-pool/categories/{categoryId}',
    'delete',
  ],

  [
    '/api/applicants/talent-pool/categories/{categoryId}/restore',
    'post',
  ],
];


for (
  const [
    path,
    method,
  ]
  of operations
) {
  const operation =
    talentPoolSwagger
      ?.paths
      ?.[path]
      ?.[method];

  assert.ok(
    operation,
    `Missing Swagger ${method.toUpperCase()} ${path}`
  );

  assert.deepStrictEqual(
    operation.tags,
    [
      'Applicant Talent Pool',
    ]
  );
}


const merged =
  buildApplicantSwaggerSpec();


for (
  const [
    path,
    method,
  ]
  of operations
) {
  assert.ok(
    merged
      ?.paths
      ?.[path]
      ?.[method],
    `Merged Swagger missing ${method.toUpperCase()} ${path}`
  );
}


assert.ok(
  (
    merged.tags ||
    []
  ).some(
    tag =>
      tag.name ===
      'Applicant Talent Pool'
  )
);


console.log(
  '✅ all 7 Category operations documented'
);

console.log(
  '✅ Applicant Talent Pool Swagger group'
);

console.log(
  '✅ Talent Pool Swagger merged into /api-docs'
);

console.log(
  '\nAPPLICANT TALENT POOL SWAGGER TEST PASSED'
);
