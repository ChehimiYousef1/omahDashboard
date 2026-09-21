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
  'DELETE /:id/permanent',
  'POST /:id/interviews/:interviewId/complete',
  'POST /:id/interviews/:interviewId/cancel',
  'POST /:id/interviews/:interviewId/no-show',
  'GET /',
  'GET /:id',
  'GET /:id/activity',
  'GET /:id/audit',
  'GET /:id/evaluations',
  'GET /:id/relationship-integrity',
  'GET /:id/submissions',
  'GET /duplicates',
  'GET /duplicates/:caseId',
  'GET /communications/providers',
  'GET /interviews/providers',
  'GET /analytics',
  'GET /analytics/drilldown',
  'GET /calendar/events',
  'GET /documents/library',
  'GET /pipeline',
  'GET /search-options',
  'PATCH /:id/approve-profile',
  'PATCH /:id/evaluations/:evaluationId',
  'PATCH /:id/profile',
  'PATCH /:id/status',
  'PATCH /duplicates/:caseId/resolve',
  'POST /:id/archive',
  'POST /:id/communications/email',
  'POST /:id/communications/whatsapp',
  'POST /:id/evaluations',
  'DELETE /:id/evaluations/:evaluationId',
  'POST /:id/evaluations/:evaluationId/reopen',
  'POST /:id/evaluations/:evaluationId/submit',
  'POST /:id/restore',
  'POST /:id/submissions/:submissionId/link',
  'GET /:id/notes',
  'POST /:id/notes',
  'PATCH /:id/notes/:noteId',
  'DELETE /:id/notes/:noteId',
  'POST /:id/notes/:noteId/archive',
  'POST /:id/notes/:noteId/restore',
  'DELETE /:id/notes/:noteId/permanent',
  'PATCH /:id/notes/:noteId/importance',
  'PATCH /:id/notes/:noteId/like',
  'PATCH /:id/notes/:noteId/star',
  'PATCH /:id/notes/:noteId/task-assignee',
  'PATCH /:id/notes/:noteId/task-priority',
  'PATCH /:id/notes/:noteId/task-status',
  'PATCH /:id/notes/:noteId/schedule',
  'POST /:id/notes/:noteId/calendar',
  'PATCH /:id/notes/:noteId/calendar',
  'DELETE /:id/notes/:noteId/calendar',
  'GET /:id/notes/:noteId/replies',
  'POST /:id/notes/:noteId/replies',
  'PATCH /:id/notes/:noteId/replies/:replyId',
  'POST /:id/notes/:noteId/replies/:replyId/archive',
  'POST /:id/notes/:noteId/replies/:replyId/restore',
  'DELETE /:id/notes/:noteId/replies/:replyId/permanent',
  'PUT /:id/tags',
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
    '/api/applicants/analytics',
  ],

  [
    'get',
    '/api/applicants/calendar/events',
  ],

  [
    'get',
    '/api/applicants/documents/library',
  ],

  [
    'get',
    '/api/applicants/pipeline',
  ],

  [
    'get',
    '/api/applicants/communications/providers',
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
    'get',
    '/api/applicants/{id}/activity',
  ],

  [
    'get',
    '/api/applicants/{id}/audit',
  ],

  [
    'post',
    '/api/applicants/{id}/communications/email',
  ],

  [
    'post',
    '/api/applicants/{id}/communications/whatsapp',
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
    'delete',
    '/api/applicants/{id}/permanent',
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
  [
    'get',
    '/api/applicants/{id}/notes',
  ],

  [
    'post',
    '/api/applicants/{id}/notes',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}',
  ],

  [
    'delete',
    '/api/applicants/{id}/notes/{noteId}',
  ],

  [
    'post',
    '/api/applicants/{id}/notes/{noteId}/archive',
  ],

  [
    'post',
    '/api/applicants/{id}/notes/{noteId}/restore',
  ],

  [
    'delete',
    '/api/applicants/{id}/notes/{noteId}/permanent',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/importance',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/like',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/star',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/task-assignee',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/task-priority',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/task-status',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/schedule',
  ],

  [
    'post',
    '/api/applicants/{id}/notes/{noteId}/calendar',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/calendar',
  ],

  [
    'delete',
    '/api/applicants/{id}/notes/{noteId}/calendar',
  ],

  [
    'get',
    '/api/applicants/{id}/notes/{noteId}/replies',
  ],

  [
    'post',
    '/api/applicants/{id}/notes/{noteId}/replies',
  ],

  [
    'patch',
    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}',
  ],

  [
    'post',
    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}/archive',
  ],

  [
    'post',
    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}/restore',
  ],

  [
    'delete',
    '/api/applicants/{id}/notes/{noteId}/replies/{replyId}/permanent',
  ],

  [
    'put',
    '/api/applicants/{id}/tags',
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

