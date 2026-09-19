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


/*
|--------------------------------------------------------------------------
| Import hygiene
|--------------------------------------------------------------------------
*/

const pathImport =
  "const path = require('path');";

assert(
  server.includes(
    pathImport
  ),
  'path import must remain present'
);


assert(
  server.indexOf(
    pathImport
  ) <
    server.indexOf(
      'dotenv.config()'
    ),
  'path must be declared with top-level imports'
);


assert.strictEqual(
  server.split(
    pathImport
  ).length - 1,
  1,
  'path must be imported exactly once'
);


/*
|--------------------------------------------------------------------------
| Old route placeholders removed
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    'AUTHENTICATION ENDPOINTS',
    'USER DIRECTORY ENDPOINTS',
    'POSTS ENDPOINTS',
    'EMAIL CAMPAIGN ENDPOINTS',
    'CRM CALLING ENDPOINTS',
    'NOTIFICATION HUB ENDPOINTS',
    'MESSAGE CENTER / CHAT',
    'COMPANY MODULE ENDPOINTS',
    'DATABASE STATS',

    '// Signup',
    '// Login',
    '// Logout',
    '// Auth Me',
    '// Get all users',
    '// Get database stats summary',
  ]
) {
  assert.strictEqual(
    server.includes(
      marker
    ),
    false,
    `Obsolete server.js placeholder remains: ${marker}`
  );
}


/*
|--------------------------------------------------------------------------
| Important composition remains
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    'createMailer()',
    'configureMiddleware(',
    'registerApiRoutes(',
    'registerHealthRoutes(',
    'express.static(',
    'SPA FALLBACK',
    'startServerLifecycle({',
    'module.exports = app',
  ]
) {
  assert(
    server.includes(
      marker
    ),
    `Required server composition missing: ${marker}`
  );
}


/*
|--------------------------------------------------------------------------
| Applicant sync compatibility remains
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    'DEFAULT_APPLICANT_SHEET_CSV_URL',
    'syncApplicantsFromSheet',
    'syncApplicantForm({',
    'APPLICANT_FORM_SOURCE_KEY',
  ]
) {
  assert(
    server.includes(
      marker
    ),
    `Applicant sync compatibility missing: ${marker}`
  );
}


/*
|--------------------------------------------------------------------------
| Route ordering remains
|--------------------------------------------------------------------------
*/

const staticIndex =
  server.indexOf(
    'express.static('
  );

const apiIndex =
  server.indexOf(
    'registerApiRoutes('
  );

const healthIndex =
  server.indexOf(
    'registerHealthRoutes('
  );

const spaIndex =
  server.indexOf(
    'SPA FALLBACK'
  );

const lifecycleIndex =
  server.indexOf(
    'startServerLifecycle({'
  );

const exportIndex =
  server.indexOf(
    'module.exports = app'
  );


assert(
  staticIndex >= 0 &&
  apiIndex >
    staticIndex &&
  healthIndex >
    apiIndex &&
  spaIndex >
    healthIndex &&
  lifecycleIndex >
    spaIndex &&
  exportIndex >
    lifecycleIndex,
  'server.js composition order changed'
);


console.log(
  '✅ path import normalized'
);

console.log(
  '✅ obsolete endpoint placeholders removed'
);

console.log(
  '✅ Applicant sync compatibility preserved'
);

console.log(
  '✅ API / health / SPA / lifecycle ordering preserved'
);

console.log(
  '\nSERVER BOOTSTRAP PHASE 4 TEST PASSED'
);
