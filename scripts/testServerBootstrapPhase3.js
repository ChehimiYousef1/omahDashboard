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


const lifecycle =
  fs.readFileSync(
    'src/bootstrap/serverLifecycle.js',
    'utf8'
  );


/*
|--------------------------------------------------------------------------
| server.js delegation
|--------------------------------------------------------------------------
*/

assert(
  server.includes(
    "require('./src/bootstrap/serverLifecycle')"
  ),
  'server.js must import lifecycle bootstrap'
);


assert(
  server.includes(
    'startServerLifecycle({'
  ),
  'server.js must invoke lifecycle bootstrap'
);


for (
  const marker
  of [
    'let httpServer',
    'let isShuttingDown',
    'async function startServer',
    'async function shutdownServer',
    'app.listen(',
    "'SIGTERM'",
    "'SIGINT'",
    'closeAllConnections',
    'process.exit(',
    'runtimeProcess.exit(',
  ]
) {
  assert.strictEqual(
    server.includes(
      marker
    ),
    false,
    `Inline lifecycle logic remains in server.js: ${marker}`
  );
}


/*
|--------------------------------------------------------------------------
| Lifecycle ownership
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    'startServerLifecycle',
    'applicationStore.init',
    'app.listen(',
    'httpServer.once',
    "'error'",
    'mongoConnection',
    '.disconnect()',
    'shutdownServer',
    "'SIGTERM'",
    "'SIGINT'",
    'closeAllConnections',
    '10000',
    'runtimeProcess.exit',
  ]
) {
  assert(
    lifecycle.includes(
      marker
    ),
    `Lifecycle module missing behavior: ${marker}`
  );
}


/*
|--------------------------------------------------------------------------
| Applicant auto-sync safety
|--------------------------------------------------------------------------
*/

for (
  const marker
  of [
    'isEnvEnabled',
    'APPLICANT_AUTO_SYNC_ENABLED',
    'APPLICANT_SYNC_WRITE_ENABLED',
    'APPLICANT_SHEET_CSV_URL',
    'syncApplicantsFromSheet',
    'dryRun:',
    'false',
  ]
) {
  assert(
    lifecycle.includes(
      marker
    ),
    `Auto-sync lifecycle behavior missing: ${marker}`
  );
}


const autoSyncIndex =
  lifecycle.indexOf(
    'APPLICANT_AUTO_SYNC_ENABLED'
  );

const writeIndex =
  lifecycle.indexOf(
    'APPLICANT_SYNC_WRITE_ENABLED'
  );

const sheetIndex =
  lifecycle.indexOf(
    'APPLICANT_SHEET_CSV_URL'
  );

const actualSyncIndex =
  lifecycle.indexOf(
    'syncApplicantsFromSheet('
  );


assert(
  autoSyncIndex >= 0 &&
  writeIndex >
    autoSyncIndex &&
  sheetIndex >
    writeIndex &&
  actualSyncIndex >
    sheetIndex,
  'Applicant auto-sync safety gate order changed'
);


assert(
  lifecycle.includes(
    'if (!autoSyncEnabled)'
  ),
  'Auto-sync enable gate missing'
);


assert(
  lifecycle.includes(
    'if (!writeEnabled)'
  ),
  'Auto-sync write gate missing'
);


assert(
  lifecycle.includes(
    'if (!sheetUrl)'
  ),
  'Auto-sync sheet URL validation missing'
);


/*
|--------------------------------------------------------------------------
| Startup ordering
|--------------------------------------------------------------------------
*/

const initIndex =
  lifecycle.indexOf(
    'applicationStore.init'
  );

const listenIndex =
  lifecycle.indexOf(
    'app.listen('
  );


assert(
  initIndex >= 0 &&
  listenIndex >
    initIndex,
  'Application storage must initialize before HTTP listener'
);


/*
|--------------------------------------------------------------------------
| Graceful shutdown
|--------------------------------------------------------------------------
*/

const shutdownGuardIndex =
  lifecycle.indexOf(
    'if (isShuttingDown)'
  );

const timeoutIndex =
  lifecycle.indexOf(
    'setTimeout('
  );

const serverCloseIndex =
  lifecycle.indexOf(
    'httpServer.close('
  );

const disconnectIndex =
  lifecycle.lastIndexOf(
    '.disconnect()'
  );


assert(
  shutdownGuardIndex >= 0,
  'Duplicate shutdown guard missing'
);


assert(
  timeoutIndex >= 0,
  'Forced shutdown timeout missing'
);


assert(
  serverCloseIndex >
    timeoutIndex,
  'HTTP close must remain in graceful shutdown'
);


assert(
  disconnectIndex >
    serverCloseIndex,
  'MongoDB must disconnect after HTTP shutdown'
);


assert(
  /forceShutdownTimer\s*\.\s*unref\s*\(\s*\)/
    .test(
      lifecycle
    ),
  'Shutdown timeout must remain unref()'
);


/*
|--------------------------------------------------------------------------
| Startup error handling
|--------------------------------------------------------------------------
*/

assert(
  lifecycle.includes(
    "'HTTP server error:'"
  ),
  'Asynchronous HTTP server error logging missing'
);


assert(
  lifecycle.includes(
    "'Failed to start server:'"
  ),
  'Startup rejection handling missing'
);


/*
|--------------------------------------------------------------------------
| Module side-effect boundary
|--------------------------------------------------------------------------
|
| Requiring serverLifecycle.js itself must not call
| startServerLifecycle automatically.
|
*/

const exportIndex =
  lifecycle.lastIndexOf(
    'module.exports'
  );


const autoInvocationAfterExport =
  lifecycle.indexOf(
    'startServerLifecycle({',
    exportIndex
  );


assert.strictEqual(
  autoInvocationAfterExport,
  -1,
  'Lifecycle module must not auto-start when required'
);


/*
|--------------------------------------------------------------------------
| server.js order
|--------------------------------------------------------------------------
*/

const spaIndex =
  server.indexOf(
    'SPA FALLBACK'
  );

const lifecycleCallIndex =
  server.indexOf(
    'startServerLifecycle({'
  );

const exportIndexServer =
  server.indexOf(
    'module.exports = app'
  );


assert(
  spaIndex >= 0 &&
  lifecycleCallIndex >
    spaIndex,
  'Server lifecycle must start after route/SPA registration'
);


assert(
  exportIndexServer >
    lifecycleCallIndex,
  'Application export must remain after lifecycle registration'
);


console.log(
  '✅ server.js delegates runtime lifecycle'
);

console.log(
  '✅ storage initializes before HTTP listener'
);

console.log(
  '✅ Applicant auto-sync keeps both safety gates'
);

console.log(
  '✅ Applicant auto-sync requires configured sheet URL'
);

console.log(
  '✅ HTTP listener failure handling preserved'
);

console.log(
  '✅ SIGTERM / SIGINT handling preserved'
);

console.log(
  '✅ duplicate shutdown guard preserved'
);

console.log(
  '✅ 10-second forced-shutdown protection preserved'
);

console.log(
  '✅ HTTP closes before MongoDB disconnect'
);

console.log(
  '✅ lifecycle module has no require-time auto-start'
);

console.log(
  '\nSERVER BOOTSTRAP PHASE 3 TEST PASSED'
);
