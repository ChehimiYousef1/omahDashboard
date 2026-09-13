'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const panel =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantInterviewPanel.tsx',
    'utf8'
  );


assert(
  panel.includes(
    `fetchApplicantInterviews(
              applicant._id,
              true`
  ),

  'Interview loader must request archived records.'
);

console.log(
  '✅ archived Interviews requested from API'
);


assert(
  panel.includes(
    '!interview.archived &&'
  ),

  'Archived Interviews must not appear in Upcoming.'
);

console.log(
  '✅ archived Interviews excluded from Upcoming'
);


assert(
  panel.includes(
    'interview.archived ||'
  ),

  'Archived Interviews must be included in History.'
);

console.log(
  '✅ archived Interviews included in History'
);


assert(
  panel.includes(
    'Archived records are preserved for interview history and audit purposes.'
  )
);

assert(
  panel.includes(
    'Archive reason'
  )
);

console.log(
  '✅ archived Interview read-only card'
);


assert.strictEqual(
  panel.includes(
    'restoreApplicantInterview'
  ),
  false,

  'Restore action must not be invented before backend support exists.'
);

console.log(
  '✅ no unsupported Restore action introduced'
);


console.log(
  '\nINTERVIEW ARCHIVE VISIBILITY TEST PASSED'
);
