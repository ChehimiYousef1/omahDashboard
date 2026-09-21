'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const source =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );


function routeSection(
  startMarker,
  endMarker
) {
  const start =
    source.indexOf(
      startMarker
    );

  assert(
    start >= 0,
    `Missing ${startMarker}`
  );

  const end =
    source.indexOf(
      endMarker,
      start +
        startMarker.length
    );

  assert(
    end >= 0,
    `Missing boundary ${endMarker}`
  );

  return source.slice(
    start,
    end
  );
}


const archive =
  routeSection(
    "'/:id/archive'",
    "'/:id/restore'"
  );


const restore =
  routeSection(
    "'/:id/restore'",
    "'/:id/permanent'"
  );


/*
|--------------------------------------------------------------------------
| Archive
|--------------------------------------------------------------------------
*/

assert(
  archive.includes(
    "'lifecycle.archived'"
  ),
  'Archive audit field missing'
);

assert(
  archive.includes(
    `before:
                false`
  ),
  'Archive previous state must be false'
);

assert(
  archive.includes(
    `after:
                true`
  ),
  'Archive next state must be true'
);

assert(
  archive.includes(
    'result.archiveReason'
  ),
  'Archive reason metadata disappeared'
);


/*
|--------------------------------------------------------------------------
| Restore
|--------------------------------------------------------------------------
*/

assert(
  restore.includes(
    "'lifecycle.archived'"
  ),
  'Restore audit field missing'
);

assert(
  restore.includes(
    `before:
                true`
  ),
  'Restore previous state must be true'
);

assert(
  restore.includes(
    `after:
                false`
  ),
  'Restore next state must be false'
);


/*
|--------------------------------------------------------------------------
| Existing API / Swagger
|--------------------------------------------------------------------------
*/

const swagger =
  require(
    '../docs/applicantSwagger'
  );

assert.deepStrictEqual(
  swagger.paths[
    '/api/applicants/{id}/audit'
  ].get.tags,
  [
    'Applicant Audit & History'
  ]
);


console.log(
  '✅ Applicant archive false → true'
);

console.log(
  '✅ Applicant restore true → false'
);

console.log(
  '✅ archive reason metadata preserved'
);

console.log(
  '✅ Applicant Audit & History preserved'
);

console.log(
  '\nAPPLICANT AUDIT B2A TEST PASSED'
);
