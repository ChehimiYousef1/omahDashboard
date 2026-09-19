'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const {
  APPLICANT_PERMISSIONS,
  canApplicantAction,
  resolveConsoleAccess,
} = require(
  '../utils/applicantPermissions'
);


/*
 * Full administrator access remains unchanged.
 */
assert.strictEqual(
  resolveConsoleAccess({
    role:
      'Super Admin',
  }),
  'full'
);

assert.strictEqual(
  resolveConsoleAccess({
    role:
      'Admin',
  }),
  'full'
);


/*
 * Explicit ACTIVE Recruiter scope receives Applicants + Calendar.
 */
const restrictedRecruiter = {
  role:
    'Recruiter',

  status:
    'Active',

  consoleAccess:
    'applicants_calendar',
};


assert.strictEqual(
  resolveConsoleAccess(
    restrictedRecruiter
  ),
  'applicants_calendar'
);


for (
  const permission
  of APPLICANT_PERMISSIONS
) {
  assert.strictEqual(
    canApplicantAction({
      ...restrictedRecruiter,
      permission,
    }),
    true,
    `Restricted recruiter must receive ${permission}`
  );
}


/*
 * Merely being a Recruiter never grants access.
 */
assert.strictEqual(
  resolveConsoleAccess({
    role:
      'Recruiter',

    status:
      'Active',
  }),
  'none'
);


assert.strictEqual(
  canApplicantAction({
    role:
      'Recruiter',

    status:
      'Active',

    permission:
      'applicant:view',
  }),
  false
);


/*
 * Scope is disabled automatically if account is no longer Active.
 */
assert.strictEqual(
  resolveConsoleAccess({
    role:
      'Recruiter',

    status:
      'Suspended',

    consoleAccess:
      'applicants_calendar',
  }),
  'none'
);


/*
 * Backend mount protection.
 *
 * Route registration may live either in server.js
 * or in the extracted bootstrap registry.
 *
 * The authorization assertion must follow the
 * architectural boundary rather than a specific file.
 */
const routeRegistrationPath =
  fs.existsSync(
    'src/bootstrap/registerApiRoutes.js'
  )
    ? 'src/bootstrap/registerApiRoutes.js'
    : 'server.js';


const routeRegistration =
  fs.readFileSync(
    routeRegistrationPath,
    'utf8'
  );


function routeMountBlock(
  routeMarker
) {
  const marker =
    `'${routeMarker}'`;

  const markerIndex =
    routeRegistration.indexOf(
      marker
    );

  assert(
    markerIndex >= 0,
    `Missing route mount: ${routeMarker}`
  );

  const mountStart =
    routeRegistration.lastIndexOf(
      'app.use(',
      markerIndex
    );

  assert(
    mountStart >= 0,
    `Could not resolve app.use() for ${routeMarker}`
  );

  const nextAppUse =
    routeRegistration.indexOf(
      'app.use(',
      markerIndex + marker.length
    );


  /*
   * Swagger is registered through a bootstrap
   * function rather than app.use() directly.
   *
   * Stop before it so Swagger's requireAdmin
   * protection is never mistaken for Applicant
   * route middleware.
   */
  const nextSwagger =
    routeRegistration.indexOf(
      'registerSwagger(',
      markerIndex + marker.length
    );


  const boundaries =
    [
      nextAppUse,
      nextSwagger,
    ].filter(
      index =>
        index >= 0
    );


  const blockEnd =
    boundaries.length > 0
      ? Math.min(
          ...boundaries
        )
      : markerIndex + 1000;


  return routeRegistration.slice(
    mountStart,
    blockEnd
  );
}


const applicantsMount =
  routeMountBlock(
    '/api/applicants'
  );


assert(
  applicantsMount.includes(
    'requireApplicantAccess'
  ),
  'Applicant API must use Applicant-specific access middleware'
);


assert.strictEqual(
  applicantsMount.includes(
    'requireAdmin'
  ),
  false,
  'Applicant API must not remain blocked by global requireAdmin'
);


const documentsMount =
  routeMountBlock(
    '/api/applicants/:applicantId/documents'
  );


assert(
  documentsMount.includes(
    'requireApplicantAccess'
  ),
  'Applicant documents must use Applicant-specific access middleware'
);


assert.strictEqual(
  documentsMount.includes(
    'requireAdmin'
  ),
  false,
  'Applicant documents must not remain blocked by global requireAdmin'
);


/*
 * Global admin middleware remains Admin/Super Admin only.
 */
const requireAdmin =
  fs.readFileSync(
    'middleware/requireAdmin.js',
    'utf8'
  );


assert.strictEqual(
  requireAdmin.includes(
    "'Recruiter'"
  ),
  false,
  'Recruiter must not be promoted to global Admin'
);


/*
 * Frontend account-specific navigation.
 */
const app =
  fs.readFileSync(
    'omahconnect-admin/src/App.tsx',
    'utf8'
  );

const sidebar =
  fs.readFileSync(
    'omahconnect-admin/src/components/layout/Sidebar.tsx',
    'utf8'
  );

const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );

const auth =
  fs.readFileSync(
    'src/routes/auth.routes.js',
    'utf8'
  );


assert(
  app.includes(
    '"applications"'
  ) &&
  app.includes(
    '"calendar"'
  ),
  'Restricted navigation destinations missing'
);

assert(
  app.includes(
    'applicantCalendarOnly'
  ),
  'Restricted navigation guard missing'
);

assert(
  app.includes(
    'effectiveActiveNav'
  ),
  'Restricted render guard missing'
);

assert(
  sidebar.includes(
    'visibleIds'
  ),
  'Sidebar account filtering missing'
);

assert(
  api.includes(
    '"applicants_calendar"'
  ),
  'Frontend User access type missing'
);

assert(
  auth.includes(
    'resolveConsoleAccess'
  ),
  'Authentication must expose authoritative console access'
);


console.log(
  '✅ Admin / Super Admin retain full console'
);

console.log(
  '✅ explicitly authorized Active Recruiter receives Applicant permissions'
);

console.log(
  '✅ ordinary Recruiter remains denied'
);

console.log(
  '✅ suspended restricted Recruiter remains denied'
);

console.log(
  '✅ Applicant API mount no longer relies on global Admin role'
);

console.log(
  '✅ global Admin middleware still excludes Recruiter'
);

console.log(
  '✅ restricted frontend navigation = Applicants + Calendar'
);

console.log(
  '\nOMAR APPLICANT + CALENDAR ACCESS TEST PASSED'
);
