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

  [
    '/api/applicants/talent-pool/options',
    'get',
  ],

  [
    '/api/applicants/talent-pool/analytics',
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

  /*
   * B5E Review / Revisit
   */
  [
    '/api/applicants/talent-pool/{applicantId}/review',
    'post',
  ],

  [
    '/api/applicants/talent-pool/{applicantId}/review/schedule',
    'post',
  ],
];


assert.strictEqual(
  operations.length,
  18,
  'Talent Pool Swagger operation matrix must contain 18 operations'
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


const reviewWorkflowOperation =
  talentPoolSwagger
    ?.paths
    ?.[
      '/api/applicants/talent-pool/{applicantId}/review'
    ]
    ?.post;

const reviewScheduleOperation =
  talentPoolSwagger
    ?.paths
    ?.[
      '/api/applicants/talent-pool/{applicantId}/review/schedule'
    ]
    ?.post;


assert.ok(
  reviewWorkflowOperation,
  'Talent Pool review Swagger operation missing'
);

assert.ok(
  reviewScheduleOperation,
  'Talent Pool review scheduling Swagger operation missing'
);


assert.strictEqual(
  reviewWorkflowOperation
    ?.requestBody
    ?.required,
  false,
  'Completing a review must allow an empty body'
);


assert.strictEqual(
  reviewScheduleOperation
    ?.requestBody
    ?.required,
  true,
  'Review scheduling must require a request body'
);


assert.deepStrictEqual(
  reviewScheduleOperation
    ?.requestBody
    ?.content
    ?.[
      'application/json'
    ]
    ?.schema
    ?.required,
  [
    'nextReviewAt',
  ],
  'Review scheduling must require nextReviewAt'
);


for (
  const operation
  of [
    reviewWorkflowOperation,
    reviewScheduleOperation,
  ]
) {
  const description =
    String(
      operation
        ?.description ||
      ''
    );

  assert.ok(
    description.includes(
      'does not create an Applicant Task'
    ),
    'Talent Pool review Swagger must document Task separation'
  );

  assert.ok(
    description.includes(
      'does not create or update a Google Calendar event'
    ),
    'Talent Pool review Swagger must document Calendar separation'
  );

  for (
    const status
    of [
      200,
      400,
      401,
      403,
      404,
      409,
      500,
    ]
  ) {
    assert.ok(
      operation
        ?.responses
        ?.[status],
      `Review Swagger must document HTTP ${status}`
    );
  }
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
  '✅ 18 total Applicant Talent Pool operations'
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
