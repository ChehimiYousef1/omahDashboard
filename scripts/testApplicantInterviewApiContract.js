'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const swagger =
  require(
    '../docs/applicantSwagger'
  );

const routeSource =
  fs.readFileSync(
    require.resolve(
      '../src/routes/applicants.routes'
    ),
    'utf8'
  );

const expectedRoutes = [
  "'/:id/interviews'",
  "'/:id/interviews/:interviewId'",
  "'/:id/interviews/:interviewId/complete'",
  "'/:id/interviews/:interviewId/cancel'",
  "'/:id/interviews/:interviewId/no-show'",
];

for (
  const route
  of expectedRoutes
) {
  assert(
    routeSource.includes(
      route
    ),

    'Applicant Interview route missing: ' +
      route
  );
}

console.log(
  '✅ Interview API routes registered'
);


const swaggerRoutes = [
  [
    'get',
    '/api/applicants/{id}/interviews',
  ],

  [
    'post',
    '/api/applicants/{id}/interviews',
  ],

  [
    'patch',
    '/api/applicants/{id}/interviews/{interviewId}',
  ],

  [
    'delete',
    '/api/applicants/{id}/interviews/{interviewId}',
  ],

  [
    'post',
    '/api/applicants/{id}/interviews/{interviewId}/complete',
  ],

  [
    'post',
    '/api/applicants/{id}/interviews/{interviewId}/cancel',
  ],

  [
    'post',
    '/api/applicants/{id}/interviews/{interviewId}/no-show',
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
    'Swagger operation missing: ' +
      method +
      ' ' +
      path
  );
}

console.log(
  '✅ Interview APIs documented in Swagger'
);


const permissions =
  require(
    '../utils/applicantPermissions'
  );

assert(
  permissions
    .APPLICANT_PERMISSIONS
    .includes(
      'applicant:interviews:view'
    )
);

assert(
  permissions
    .APPLICANT_PERMISSIONS
    .includes(
      'applicant:interviews:manage'
    )
);

console.log(
  '✅ Interview permissions registered'
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
    routeSource.includes(
      forbidden
    ),

    false,

    'Hard-delete route operation found: ' +
      forbidden
  );
}

console.log(
  '✅ no Interview hard-delete API introduced'
);

console.log(
  '\nINTERVIEW MANAGEMENT API CONTRACT TEST PASSED'
);

