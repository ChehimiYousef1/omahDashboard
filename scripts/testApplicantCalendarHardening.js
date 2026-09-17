'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const route =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );

const page =
  fs.readFileSync(
    'omahconnect-admin/src/pages/CalendarPage.tsx',
    'utf8'
  );

const service =
  fs.readFileSync(
    'services/applicantCalendarService.js',
    'utf8'
  );

const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );

const analyticsTest =
  fs.readFileSync(
    'scripts/testApplicantAnalyticsFrontend.js',
    'utf8'
  );


const routeStart =
  route.indexOf(
    "'/calendar/events'"
  );

const routeEnd =
  route.indexOf(
    "router.get(\n    '/:id'",
    routeStart
  );


assert.ok(
  routeStart >=
    0,
  'Calendar route missing'
);

assert.ok(
  routeEnd >
    routeStart,
  'Calendar route boundary missing'
);


const calendarRoute =
  route.slice(
    routeStart,
    routeEnd
  );


assert.ok(
  calendarRoute.includes(
    "'applicant:view'"
  ),
  'Calendar aggregation must use generic Applicant read permission'
);

assert.strictEqual(
  calendarRoute.includes(
    "'applicant:notes:view'"
  ),
  false,
  'Calendar aggregation must not rely only on Notes permission'
);


assert.ok(
  page.includes(
    'function isSafeExternalUrl('
  ),
  'safe external URL helper missing'
);

assert.ok(
  page.includes(
    'url.protocol ===\n      "https:"'
  ),
  'HTTPS external URL allow-list missing'
);

assert.ok(
  page.includes(
    '"localhost"'
  ),
  'localhost development URL handling missing'
);

assert.ok(
  page.includes(
    'isSafeExternalUrl(\n                selectedEvent.eventUrl'
  ),
  'Calendar event link is not guarded'
);


for (
  const marker
  of [
    'range: {',
    'events:',
    'total:',
  ]
) {
  assert.ok(
    service.includes(
      marker
    ),
    `Calendar service contract missing: ${marker}`
  );
}


assert.ok(
  api.includes(
    'response.data.range'
  )
);

assert.ok(
  api.includes(
    'response.data.events'
  )
);

assert.ok(
  api.includes(
    'response.data.total'
  )
);


assert.ok(
  analyticsTest.includes(
    "'Notes & Tasks'"
  )
);

assert.ok(
  analyticsTest.includes(
    'twelve professional analytics tabs'
  )
);


console.log(
  '✅ Calendar aggregate uses applicant:view'
);

console.log(
  '✅ Calendar external URLs are allow-listed'
);

console.log(
  '✅ Calendar response shape matches frontend contract'
);

console.log(
  '✅ Notes & Tasks included in twelve-tab analytics regression'
);

console.log(
  '\nAPPLICANT CALENDAR HARDENING TEST PASSED'
);
