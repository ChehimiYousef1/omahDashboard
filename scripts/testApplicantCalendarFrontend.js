'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');


function read(
  relative
) {
  return fs.readFileSync(
    path.resolve(
      __dirname,
      '..',
      relative
    ),
    'utf8'
  );
}


const nav =
  read(
    'omahconnect-admin/src/data/mockData.ts'
  );

const sidebar =
  read(
    'omahconnect-admin/src/components/layout/Sidebar.tsx'
  );

const app =
  read(
    'omahconnect-admin/src/App.tsx'
  );

const api =
  read(
    'omahconnect-admin/src/services/api.ts'
  );

const page =
  read(
    'omahconnect-admin/src/pages/CalendarPage.tsx'
  );


assert(
  nav.includes(
    'id: "calendar"'
  )
);

assert(
  nav.includes(
    'label: "Calendar"'
  )
);

assert(
  sidebar.includes(
    'CalendarDays'
  )
);

assert(
  sidebar.includes(
    '"calendar-days": CalendarDays'
  )
);

assert(
  app.includes(
    'import { CalendarPage }'
  )
);

assert(
  app.includes(
    'activeNav === "calendar"'
  )
);

assert(
  api.includes(
    'fetchApplicantCalendarEvents'
  )
);

assert(
  api.includes(
    '/applicants/calendar/events'
  )
);

for (
  const label
  of [
    'Recruitment Calendar',
    'Month',
    'Week',
    'Agenda',
    'Today',
    'Interviews',
    'Tasks',
    'Scheduled Notes',
    'Reminders',
    'Calendar Synced',
    'Sync Error',
    'Open Applicant',
    'Open Meeting / Calendar',
  ]
) {
  assert(
    page.includes(
      label
    ),
    `Missing Calendar UI: ${label}`
  );
}

assert(
  page.includes(
    'fetchApplicantMaster'
  )
);

assert(
  page.includes(
    'ApplicantProfilePanel'
  )
);

for (
  const forbidden
  of [
    'addApplicantInternalNoteToCalendar',
    'updateApplicantInternalNoteCalendar',
    'removeApplicantInternalNoteFromCalendar',
    'createCalendarClient',
    'events.insert',
    'events.patch',
    'events.delete',
  ]
) {
  assert.strictEqual(
    page.includes(
      forbidden
    ),
    false,
    `Calendar page must remain read-only: ${forbidden}`
  );
}

console.log(
  '✅ Calendar navigation connected'
);

console.log(
  '✅ Month / Week / Agenda views connected'
);

console.log(
  '✅ Calendar filters and operational summary connected'
);

console.log(
  '✅ event details and Applicant profile navigation connected'
);

console.log(
  '✅ Calendar workspace contains no external write action'
);

console.log(
  '\nAPPLICANT CALENDAR FRONTEND TEST PASSED'
);
