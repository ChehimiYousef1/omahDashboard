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
    '/api/applicants/talent-pool',
    'get',
  ],

  /*
   * B5C Category CRUD
   */
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


  /*
   * B5D1 Membership Lifecycle
   */
  [
    '/api/applicants/talent-pool/{applicantId}',
    'get',
  ],

  [
    '/api/applicants/talent-pool/{applicantId}',
    'post',
  ],

  [
    '/api/applicants/talent-pool/{applicantId}',
    'put',
  ],

  [
    '/api/applicants/talent-pool/{applicantId}',
    'patch',
  ],

  [
    '/api/applicants/talent-pool/{applicantId}',
    'delete',
  ],

  [
    '/api/applicants/talent-pool/{applicantId}/restore',
    'post',
  ],
];


assert.strictEqual(
  operations.length,
  14,
  'Talent Pool Swagger operation matrix must contain 14 operations'
);


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
    ],
    `${method.toUpperCase()} ${path} must remain under Applicant Talent Pool`
  );
}


const discoveryOperation =
  talentPoolSwagger
    ?.paths
    ?.[
      '/api/applicants/talent-pool'
    ]
    ?.get;

assert.ok(
  discoveryOperation,
  'Talent Pool discovery Swagger operation missing'
);

const discoveryParameters =
  new Set(
    (
      discoveryOperation.parameters ||
      []
    ).map(
      parameter =>
        parameter.name
    )
  );

const requiredDiscoveryParameters = [
  'q',
  'categoryId',
  'role',
  'skill',
  'technicalExperienceLevel',
  'tag',
  'priority',
  'ownerId',
  'country',
  'city',
  'positionTrack',
  'positionType',
  'status',
  'reviewStatus',
  'active',
  'page',
  'limit',
  'sortBy',
  'sortOrder',
];

for (
  const parameter
  of requiredDiscoveryParameters
) {
  assert.ok(
    discoveryParameters.has(
      parameter
    ),
    `Missing Talent Pool discovery parameter: ${parameter}`
  );
}

assert.ok(
  discoveryOperation
    ?.responses
    ?.[400],
  'Talent Pool discovery must document HTTP 400'
);


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
  ),
  'Applicant Talent Pool Swagger tag missing'
);


/*
 * DELETE must explicitly remain a Talent Pool
 * removal operation, not Applicant deletion.
 */
const deleteOperation =
  talentPoolSwagger
    .paths[
      '/api/applicants/talent-pool/{applicantId}'
    ]
    .delete;

assert.ok(
  String(
    deleteOperation.description ||
    ''
  ).includes(
    'never deleted'
  ),
  'Talent Pool DELETE must document Applicant deletion safety'
);


console.log(
  '✅ 7 Category CRUD Swagger operations preserved'
);

console.log(
  '✅ 6 Membership lifecycle Swagger operations added'
);

console.log(
  '✅ 14 total Applicant Talent Pool operations'
);

console.log(
  '✅ all operations remain under Applicant Talent Pool'
);

console.log(
  '✅ Talent Pool Swagger merged into /api-docs'
);

console.log(
  '✅ DELETE documents Applicant deletion safety'
);

console.log(
  '\nAPPLICANT TALENT POOL SWAGGER TEST PASSED'
);
