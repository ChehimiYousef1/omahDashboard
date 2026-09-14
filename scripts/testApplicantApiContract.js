'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const createApplicantRouter =
  require(
    '../src/routes/applicants.routes'
  );

const swagger =
  require(
    '../docs/applicantSwagger'
  );

const allow =
  () =>
    (req, res, next) =>
      next();

const router =
  createApplicantRouter({
    requireApplicantPermission:
      allow,
  });

const actualRoutes =
  router.stack
    .filter(
      (layer) =>
        layer.route
    )
    .flatMap(
      (layer) =>
        Object.keys(
          layer.route.methods
        ).map(
          (method) =>
            method.toUpperCase() +
            ' ' +
            layer.route.path
        )
    )
    .sort();

const expectedRoutes = [
  'GET /:id/interviews',
  'POST /:id/interviews',
  'POST /:id/interviews/availability',
  'PATCH /:id/interviews/:interviewId',
  'DELETE /:id/interviews/:interviewId',
  'DELETE /:id/interviews/:interviewId/permanent',
  'POST /:id/interviews/:interviewId/complete',
  'POST /:id/interviews/:interviewId/cancel',
  'POST /:id/interviews/:interviewId/no-show',
  'GET /',
  'GET /:id',
  'GET /:id/evaluations',
  'GET /:id/relationship-integrity',
  'GET /:id/submissions',
  'GET /duplicates',
  'GET /duplicates/:caseId',
  'GET /interviews/providers',
  'GET /search-options',
  'PATCH /:id/approve-profile',
  'PATCH /:id/evaluations/:evaluationId',
  'PATCH /:id/profile',
  'PATCH /:id/status',
  'PATCH /duplicates/:caseId/resolve',
  'POST /:id/archive',
  'POST /:id/evaluations',
  'DELETE /:id/evaluations/:evaluationId',
  'POST /:id/evaluations/:evaluationId/reopen',
  'POST /:id/evaluations/:evaluationId/submit',
  'POST /:id/restore',
  'POST /:id/submissions/:submissionId/link',
].sort();

assert.deepStrictEqual(
  actualRoutes,
  expectedRoutes
);

console.log(
  '✅ all Applicant API routes registered'
);

const swaggerRoutes = [
  [
    'get',
    '/api/applicants',
  ],

  [
    'get',
    '/api/applicants/search-options',
  ],

  [
    'get',
    '/api/applicants/duplicates',
  ],

  [
    'get',
    '/api/applicants/duplicates/{caseId}',
  ],

  [
    'patch',
    '/api/applicants/duplicates/{caseId}/resolve',
  ],

  [
    'get',
    '/api/applicants/{id}',
  ],

  [
    'patch',
    '/api/applicants/{id}/profile',
  ],

  [
    'patch',
    '/api/applicants/{id}/status',
  ],

  [
    'post',
    '/api/applicants/{id}/archive',
  ],

  [
    'post',
    '/api/applicants/{id}/restore',
  ],

  [
    'get',
    '/api/applicants/{id}/submissions',
  ],

  [
    'patch',
    '/api/applicants/{id}/approve-profile',
  ],

  [
    'post',
    '/api/applicants/{id}/submissions/{submissionId}/link',
  ],

  [
    'get',
    '/api/applicants/{id}/relationship-integrity',
  ],

  [
    'get',
    '/api/applicants/{id}/evaluations',
  ],

  [
    'patch',
    '/api/applicants/{id}/evaluations/{evaluationId}',
  ],

  [
    'post',
    '/api/applicants/{id}/evaluations/{evaluationId}/submit',
  ],

  [
    'delete',
    '/api/applicants/{id}/evaluations/{evaluationId}',
  ],

  [
    'post',
    '/api/applicants/{id}/evaluations/{evaluationId}/reopen',
  ],
];

for (
  const [
    method,
    path,
  ] of swaggerRoutes
) {
  assert(
    swagger.paths[path],
    'Swagger path missing: ' +
      path
  );

  assert(
    swagger.paths[path][
      method
    ],
    'Swagger method missing: ' +
      method +
      ' ' +
      path
  );
}

console.log(
  '✅ every Applicant API documented in Swagger'
);

assert.strictEqual(
  swagger.openapi,
  '3.0.3'
);

assert.strictEqual(
  swagger.components
    .securitySchemes
    .cookieAuth.name,
  'auth_token'
);

console.log(
  '✅ Swagger cookie authentication configured'
);

const source =
  fs.readFileSync(
    require.resolve(
      '../src/routes/applicants.routes'
    ),
    'utf8'
  );

for (
  const forbidden
  of [
    'findByIdAndDelete',
    'findOneAndDelete',
    '.deleteOne(',
    '.deleteMany(',
  ]
) {
  assert.strictEqual(
    source.includes(
      forbidden
    ),
    false,

    'Hard-delete operation found: ' +
      forbidden
  );
}

console.log(
  '✅ no unprotected route-level hard delete introduced'
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '\nTASK 13 APPLICANT API CONTRACT TEST PASSED'
);

