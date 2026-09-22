'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const createApplicantReportRouter =
  require(
    '../src/routes/applicantReports.routes'
  );


const EXPECTED_PERMISSIONS = [
  'applicant:view',
  'applicant:interviews:view',
  'applicant:evaluations:view',
];


function permissionMiddleware(
  permission
) {
  const middleware =
    (
      req,
      res,
      next
    ) => next();

  /*
   * Test-only metadata.
   * Lets us inspect the permission chain
   * attached to each individual route.
   */
  middleware
    ._applicantPermission =
    permission;

  return middleware;
}


const router =
  createApplicantReportRouter({
    requireApplicantPermission:
      permission =>
        permissionMiddleware(
          permission
        ),

    services: {
      async buildApplicantSummaryReport() {
        throw new Error(
          'Summary handler must not execute during contract inspection'
        );
      },

      async renderApplicantSummaryPdf() {
        return Buffer.from(
          '%PDF-summary-test'
        );
      },

      async buildApplicantRecruitmentReport() {
        throw new Error(
          'Recruitment handler must not execute during contract inspection'
        );
      },

      async renderApplicantRecruitmentPdf() {
        return Buffer.from(
          '%PDF-recruitment-test'
        );
      },
    },
  });


function findRoute(
  path
) {
  return router.stack.find(
    layer =>
      layer
        ?.route
        ?.path ===
      path
  );
}


function routePermissions(
  path
) {
  const route =
    findRoute(path);

  assert.ok(
    route,
    `Missing report route: ${path}`
  );

  return route
    .route
    .stack
    .map(
      layer =>
        layer
          ?.handle
          ?._applicantPermission
    )
    .filter(Boolean);
}


const summaryRoute =
  findRoute(
    '/summary.pdf'
  );

assert.ok(
  summaryRoute,
  'Summary PDF route missing'
);

assert.strictEqual(
  Boolean(
    summaryRoute
      .route
      .methods
      .get
  ),
  true
);

assert.deepStrictEqual(
  routePermissions(
    '/summary.pdf'
  ),
  EXPECTED_PERMISSIONS
);


const recruitmentRoute =
  findRoute(
    '/recruitment.pdf'
  );

assert.ok(
  recruitmentRoute,
  'Recruitment PDF route missing'
);

assert.strictEqual(
  Boolean(
    recruitmentRoute
      .route
      .methods
      .get
  ),
  true
);

assert.deepStrictEqual(
  routePermissions(
    '/recruitment.pdf'
  ),
  EXPECTED_PERMISSIONS
);


const bootstrap =
  fs.readFileSync(
    'src/bootstrap/registerApiRoutes.js',
    'utf8'
  );

assert.ok(
  bootstrap.includes(
    '/api/applicants/:applicantId/reports'
  )
);

assert.ok(
  bootstrap.includes(
    'createApplicantReportsRouter'
  )
);


const source =
  fs.readFileSync(
    'src/routes/applicantReports.routes.js',
    'utf8'
  );

assert.ok(
  source.includes(
    "'/summary.pdf'"
  )
);

assert.ok(
  source.includes(
    "'/recruitment.pdf'"
  )
);

assert.ok(
  source.includes(
    "'application/pdf'"
  )
);

assert.ok(
  source.includes(
    "'Content-Disposition'"
  )
);

assert.ok(
  source.includes(
    "'private, no-store'"
  )
);

assert.ok(
  source.includes(
    'omah-applicant-summary-'
  )
);

assert.ok(
  source.includes(
    'omah-recruitment-report-'
  )
);


console.log(
  '✅ Summary PDF route registered'
);

console.log(
  '✅ Recruitment PDF route registered'
);

console.log(
  '✅ Summary permission chain exact'
);

console.log(
  '✅ Recruitment permission chain exact'
);

console.log(
  '✅ Applicant + Interview + Evaluation read permissions preserved'
);

console.log(
  '✅ PDF content type configured'
);

console.log(
  '✅ attachment responses configured'
);

console.log(
  '✅ private no-store caching configured'
);

console.log(
  '\nAPPLICANT REPORT API CONTRACT TEST PASSED'
);
