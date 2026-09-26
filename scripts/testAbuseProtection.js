'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');


function read(relativePath) {
  return fs.readFileSync(
    path.join(
      __dirname,
      '..',
      relativePath
    ),
    'utf8'
  );
}


const middleware =
  read(
    'src/bootstrap/configureMiddleware.js'
  );

for (
  const pattern
  of [
    /skipSuccessfulRequests:\s*true/,
    /'\/api\/auth\/signup',\s*signupLimiter/,
    /'\/api',\s*apiBurstLimiter,\s*apiMutationLimiter/,
    /'\/api\/emails',\s*bulkCampaignLimiter/,
    /'\/api\/companies\/communications',\s*bulkCampaignLimiter/,
    /'\/api\/notifications',\s*outboundCommunicationLimiter/,
    /'\/api\/messages\/send',\s*outboundCommunicationLimiter/,
    /'\/api\/calls\/initiate',\s*externalActionLimiter/,
    /'\/api\/applications\/sync-sheet',\s*sheetSyncLimiter/,
    /'\/api\/applicants\/:applicantId\/documents',\s*documentMutationLimiter/,
    /'\/api\/applicants\/:applicantId\/reports',\s*reportGenerationLimiter/,
    /'\/api\/applicants\/:id\/communications',\s*outboundCommunicationLimiter/,
    /'\/api\/applicants\/:id\/notes\/:noteId\/calendar',\s*externalActionLimiter/,
    /'\/api\/applicants\/:id\/interviews',\s*externalActionLimiter/,
    /'\/api\/applicants\/:id\/permanent',\s*destructiveActionLimiter/,
    /const applicantWebhookLimiter\s*=\s*rateLimit/,
  ]
) {
  assert.match(
    middleware,
    pattern
  );
}

console.log(
  '✅ tiered IP-based abuse-control mounts'
);


const authRoutes =
  read(
    'src/routes/auth.routes.js'
  );

assert.strictEqual(
  (
    authRoutes.match(
      /res\.cookie\(\s*AUTH_COOKIE_NAME,\s*token,\s*authCookieOptions\(\)/g
    ) ||
    []
  ).length,
  2
);

assert.match(
  authRoutes,
  /res\.clearCookie\(\s*AUTH_COOKIE_NAME,\s*authCookieClearOptions\(\)/
);

console.log(
  '✅ hardened auth-cookie wiring'
);


const emailRoutes =
  read(
    'src/routes/emails.routes.js'
  );

assert.match(
  emailRoutes,
  /process\.env\.NODE_ENV === 'production'/
);

assert.match(
  emailRoutes,
  /Email delivery is not configured\./
);

assert.match(
  emailRoutes,
  /Email delivery failed\./
);

assert.doesNotMatch(
  emailRoutes,
  /Real email sending failed:\s*\$\{smtpError\.message\}/
);

console.log(
  '✅ production outbound-email fail-closed contract'
);


const routeRegistry =
  read(
    'src/bootstrap/registerApiRoutes.js'
  );

for (
  const route
  of [
    '/api/emails',
    '/api/calls',
    '/api/notifications',
    '/api/messages',
    '/api/companies',
    '/api/applications',
  ]
) {
  const index =
    routeRegistry.indexOf(
      `'${route}'`
    );

  assert.ok(
    index >= 0,
    `Missing route mount: ${route}`
  );

  const block =
    routeRegistry.slice(
      index,
      index + 450
    );

  assert.match(
    block,
    /authenticateToken/
  );

  assert.match(
    block,
    /requireAdmin/
  );
}

console.log(
  '✅ legacy administrative route authorization preserved'
);

console.log('');
console.log(
  'P7 ABUSE PROTECTION CONTRACT TEST PASSED'
);
