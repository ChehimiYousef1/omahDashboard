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

const middleware =
  fs.readFileSync(
    'src/bootstrap/configureMiddleware.js',
    'utf8'
  );

const health =
  fs.readFileSync(
    'src/bootstrap/registerHealthRoutes.js',
    'utf8'
  );

const mailer =
  fs.readFileSync(
    'config/mailer.js',
    'utf8'
  );


/*
|--------------------------------------------------------------------------
| server.js delegation
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    'createMailer',
    'configureMiddleware',
    'registerApiRoutes',
    'registerHealthRoutes',
  ]
) {
  assert(
    server.includes(
      marker
    ),
    `server.js missing bootstrap delegation: ${marker}`
  );
}


for (
  const marker
  of [
    "require('helmet')",
    "require('express-rate-limit')",
    "require('cors')",
    "require('cookie-parser')",
    "require('nodemailer')",
    'nodemailer.createTransport',
  ]
) {
  assert.strictEqual(
    server.includes(
      marker
    ),
    false,
    `server.js still implements extracted concern: ${marker}`
  );
}


/*
|--------------------------------------------------------------------------
| Middleware ownership and ordering
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    "require('express')",
    "require('helmet')",
    "require('express-rate-limit')",
    "require('cors')",
    "require('cookie-parser')",
    "'/api/auth/login'",
    "'/api/applicant-form/webhook'",
    "'64kb'",
    "'2mb'",
    'cookieParser()',
  ]
) {
  assert(
    middleware.includes(
      marker
    ),
    `Middleware bootstrap missing: ${marker}`
  );
}


const loginIndex =
  middleware.indexOf(
    "'/api/auth/login'"
  );

const corsIndex =
  middleware.indexOf(
    'cors({'
  );

const webhookIndex =
  middleware.indexOf(
    "'/api/applicant-form/webhook'"
  );

const globalJsonIndex =
  middleware.indexOf(
    "'2mb'"
  );

const cookieIndex =
  middleware.indexOf(
    'cookieParser()'
  );


assert(
  loginIndex >= 0 &&
  corsIndex >
    loginIndex &&
  webhookIndex >
    corsIndex &&
  globalJsonIndex >
    webhookIndex &&
  cookieIndex >
    globalJsonIndex,
  'Global middleware ordering changed'
);


assert(
  middleware.includes(
    "'entity.too.large'"
  ),
  'Webhook payload-size error handling missing'
);


assert(
  middleware.includes(
    "'Invalid JSON payload.'"
  ),
  'Webhook invalid-JSON handling missing'
);


/*
|--------------------------------------------------------------------------
| Health / readiness
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    "'/health'",
    "'/ready'",
    "'no-store'",
    'getConnection()',
    'readyState ===',
    "'not_ready'",
    "'unavailable'",
    "'ready'",
    "'connected'",
  ]
) {
  assert(
    health.includes(
      marker
    ),
    `Health bootstrap missing behavior: ${marker}`
  );
}


assert(
  server.indexOf(
    'registerHealthRoutes('
  ) <
    server.indexOf(
      'SPA FALLBACK'
    ),
  'Health routes must remain before SPA fallback'
);


/*
|--------------------------------------------------------------------------
| Mailer
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    "require('nodemailer')",
    'nodemailer.createTransport',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
  ]
) {
  assert(
    mailer.includes(
      marker
    ),
    `Mailer config missing: ${marker}`
  );
}


assert.strictEqual(
  /password\s*[:=]\s*['"][^'"]+['"]/i
    .test(
      mailer
    ),
  false,
  'Mailer config must not contain a hardcoded password'
);


/*
|--------------------------------------------------------------------------
| Lifecycle delegation
|--------------------------------------------------------------------------
|
| Phase 3 intentionally moves runtime lifecycle out
| of server.js while preserving Phase-2 concerns.
|
*/

assert(
  server.includes(
    'startServerLifecycle'
  ),
  'server.js must delegate server lifecycle'
);


for (
  const marker
  of [
    'async function startServer',
    'applicationStore.init',
    'app.listen',
    'shutdownServer',
    "'SIGTERM'",
    "'SIGINT'",
  ]
) {
  assert.strictEqual(
    server.includes(
      marker
    ),
    false,
    `Lifecycle implementation must not remain in server.js: ${marker}`
  );
}


console.log(
  '✅ mailer extracted from server.js'
);

console.log(
  '✅ global middleware extracted from server.js'
);

console.log(
  '✅ login rate limit preserved'
);

console.log(
  '✅ CORS behavior remains centralized'
);

console.log(
  '✅ webhook remains before global JSON parser'
);

console.log(
  '✅ webhook 64 KB protection preserved'
);

console.log(
  '✅ global 2 MB JSON parser preserved'
);

console.log(
  '✅ health/readiness extracted'
);

console.log(
  '✅ health routes remain before SPA fallback'
);

console.log(
  '✅ startup/shutdown delegated after Phase 2'
);

console.log(
  '\nSERVER BOOTSTRAP PHASE 2 TEST PASSED'
);
