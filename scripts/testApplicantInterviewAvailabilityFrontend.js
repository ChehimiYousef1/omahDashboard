'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );

const panel =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantInterviewPanel.tsx',
    'utf8'
  );


assert(
  api.includes(
    'ApplicantInterviewAvailability'
  )
);

assert(
  api.includes(
    'ApplicantInterviewAvailabilityPayload'
  )
);

assert(
  api.includes(
    'checkApplicantInterviewAvailability'
  )
);

assert(
  api.includes(
    '/interviews/availability'
  )
);

console.log(
  '✅ frontend availability API client'
);


assert(
  panel.includes(
    'checkApplicantInterviewAvailability'
  )
);

assert(
  panel.includes(
    'Check Availability'
  )
);

assert(
  panel.includes(
    'OMAH availability clear'
  )
);

assert(
  panel.includes(
    'Time unavailable'
  )
);

assert(
  panel.includes(
    'Google Calendar has not been fully checked'
  )
);

console.log(
  '✅ availability UI states'
);


assert(
  panel.includes(
    'excludeInterviewId'
  )
);

console.log(
  '✅ reschedule excludes current interview'
);


assert(
  panel.includes(
    'normalizedScheduleParticipants'
  )
);

assert(
  panel.includes(
    '"interviewer"'
  )
);

console.log(
  '✅ interviewers identified for availability'
);


const saveIndex =
  panel.indexOf(
    'async function saveSchedule()'
  );

const availabilityIndex =
  panel.indexOf(
    'await checkScheduleAvailability()',
    saveIndex
  );

const createIndex =
  panel.indexOf(
    'createApplicantInterview(',
    saveIndex
  );

assert(
  availabilityIndex >= 0,
  'saveSchedule does not check availability.'
);

assert(
  createIndex < 0 ||
  availabilityIndex <
    createIndex,
  'Availability must be checked before interview creation.'
);

console.log(
  '✅ availability gate runs before scheduling'
);


assert.strictEqual(
  panel.includes(
    'updateApplicantStatus('
  ),
  false
);

console.log(
  '✅ recruitment status remains independent'
);


console.log(
  '\nINTERVIEW AVAILABILITY FRONTEND CONTRACT TEST PASSED'
);
