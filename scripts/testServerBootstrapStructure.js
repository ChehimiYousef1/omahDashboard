'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const server =
  fs.readFileSync(
    'server.js',
    'utf8'
  );

const routes =
  fs.readFileSync(
    'src/bootstrap/registerApiRoutes.js',
    'utf8'
  );

const swagger =
  fs.readFileSync(
    'src/bootstrap/registerSwagger.js',
    'utf8'
  );


/*
 * server.js should now coordinate rather than implement
 * every API mount.
 */
assert(
  server.includes(
    'registerApiRoutes'
  ),
  'server.js must invoke central API registry'
);


assert.strictEqual(
  server.includes(
    "swagger-ui-express"
  ),
  false,
  'Swagger UI implementation must not remain in server.js'
);


assert.strictEqual(
  server.includes(
    "app.use(\n  '/api/auth'"
  ),
  false,
  'Individual API mounts must not remain in server.js'
);


/*
 * Every historical top-level API prefix must be registered.
 */
const expectedRouteMarkers = [
  "'/api/auth'",
  "'/api/users'",
  "'/api/posts'",
  "'/api/emails'",
  "'/api/calls'",
  "'/api/notifications'",
  "'/api/messages'",
  "'/api/companies'",
  "'/api/applications'",
  "'/api/applicants/:applicantId/documents'",
  "'/api/applicants'",
  'registerSwagger(',
  "'/api/dev'",
];


let previousIndex = -1;

for (
  const marker
  of expectedRouteMarkers
) {
  const index =
    routes.indexOf(
      marker
    );

  assert(
    index >= 0,
    `Missing API registry marker: ${marker}`
  );

  assert(
    index >
      previousIndex,
    `API registration order changed near ${marker}`
  );

  previousIndex =
    index;
}


/*
 * Applicant authorization boundaries must remain explicit.
 */
const documentStart =
  routes.indexOf(
    "'/api/applicants/:applicantId/documents'"
  );

const applicantStart =
  routes.indexOf(
    "'/api/applicants'",
    documentStart + 1
  );

const swaggerStart =
  routes.indexOf(
    'registerSwagger('
  );


const documentBlock =
  routes.slice(
    documentStart,
    applicantStart
  );


const applicantBlock =
  routes.slice(
    applicantStart,
    swaggerStart
  );


assert(
  documentBlock.includes(
    'requireApplicantAccess'
  ),
  'Applicant document API lost Applicant access gate'
);


assert(
  applicantBlock.includes(
    'requireApplicantAccess'
  ),
  'Applicant API lost Applicant access gate'
);


assert.strictEqual(
  documentBlock.includes(
    'requireAdmin'
  ),
  false,
  'Applicant documents must not revert to global Admin-only gate'
);


assert.strictEqual(
  applicantBlock.includes(
    'requireAdmin'
  ),
  false,
  'Applicant API must not revert to global Admin-only gate'
);


/*
 * Swagger security.
 */
assert(
  swagger.includes(
    "'/api-docs'"
  ),
  'Swagger path changed'
);


const authIndex =
  swagger.indexOf(
    'authenticateToken'
  );

const adminIndex =
  swagger.indexOf(
    'requireAdmin',
    authIndex
  );

assert(
  authIndex >= 0 &&
  adminIndex >
    authIndex,
  'Swagger authentication / Admin protection missing'
);


assert(
  swagger.includes(
    'applicantSwaggerSpec'
  ) &&
  swagger.includes(
    'applicantDocumentSwagger'
  ),
  'Swagger documents are not centrally composed'
);


assert(
  swagger.includes(
    'paths:'
  ) &&
  swagger.includes(
    'tags:'
  ),
  'Swagger paths/tags composition missing'
);


assert(
  swagger.includes(
    'swaggerDocsCsp'
  ),
  'Swagger CSP protection missing'
);


/*
 * Important server responsibilities remain in server.js
 * during Phase 1.
 */
for (
  const marker
  of [
    '/health',
    '/ready',
    'startServer',
    'applicationStore.init',
    'express.static',
  ]
) {
  assert(
    server.includes(
      marker
    ),
    `Phase-1 refactor accidentally removed ${marker}`
  );
}


console.log(
  '✅ server.js delegates API registration'
);

console.log(
  '✅ all top-level API prefixes preserved'
);

console.log(
  '✅ API registration order preserved'
);

console.log(
  '✅ Applicant RBAC preserved'
);

console.log(
  '✅ Swagger composition centralized'
);

console.log(
  '✅ Swagger authentication + CSP preserved'
);

console.log(
  '✅ health/readiness/startup remain untouched'
);

console.log(
  '\nSERVER BOOTSTRAP STRUCTURE TEST PASSED'
);
