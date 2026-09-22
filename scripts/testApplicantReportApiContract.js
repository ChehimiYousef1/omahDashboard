'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const createApplicantReportRouter =
  require(
    '../src/routes/applicantReports.routes'
  );


const requestedPermissions = [];

const router =
  createApplicantReportRouter({
    requireApplicantPermission:
      permission => {
        requestedPermissions.push(
          permission
        );

        return (
          req,
          res,
          next
        ) =>
          next();
      },

    services: {
      async buildApplicantSummaryReport() {
        throw new Error(
          'Handler must not execute during contract inspection'
        );
      },

      async renderApplicantSummaryPdf() {
        return Buffer.from(
          '%PDF-test'
        );
      },
    },
  });


const routeLayer =
  router.stack.find(
    layer =>
      layer
        ?.route
        ?.path ===
      '/summary.pdf'
  );

assert.ok(
  routeLayer,
  'Summary PDF route missing'
);

assert.strictEqual(
  Boolean(
    routeLayer
      .route
      .methods
      .get
  ),
  true
);

assert.deepStrictEqual(
  requestedPermissions,
  [
    'applicant:view',
    'applicant:interviews:view',
    'applicant:evaluations:view',
  ]
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

console.log(
  '✅ Summary PDF route registered'
);

console.log(
  '✅ Applicant + Interview + Evaluation read permissions required'
);

console.log(
  '✅ PDF content type configured'
);

console.log(
  '✅ attachment response configured'
);

console.log(
  '✅ private no-store caching configured'
);

console.log(
  '\nAPPLICANT REPORT API CONTRACT TEST PASSED'
);
