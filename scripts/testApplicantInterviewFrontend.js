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

const profile =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantProfilePanel.tsx',
    'utf8'
  );


const functions = [
  'fetchApplicantInterviews',
  'createApplicantInterview',
  'updateApplicantInterview',
  'completeApplicantInterview',
  'cancelApplicantInterview',
  'markApplicantInterviewNoShow',
  'archiveApplicantInterview',
];

for (const name of functions) {
  assert(
    api.includes(name),
    'Missing Interview API client function: ' +
      name
  );
}

console.log(
  '✅ Interview API client functions'
);


const capabilities = [
  'Schedule Interview',
  'Upcoming Interviews',
  'Interview History',
  'Reschedule / Edit',
  'Complete Interview',
  'No-show',
  'Archive',
  'Interview Feedback',
];

for (
  const capability
  of capabilities
) {
  assert(
    panel.includes(
      capability
    ),
    'Missing Interview UI capability: ' +
      capability
  );
}

console.log(
  '✅ Interview UI capabilities'
);


assert(
  profile.includes(
    'ApplicantInterviewPanel'
  ),
  'Interview panel import missing'
);

assert(
  profile.includes(
    '"interviews" && ('
  ),
  'Interview tab rendering missing'
);

console.log(
  '✅ Interview tab integration'
);


assert.strictEqual(
  panel.includes(
    'updateApplicantStatus('
  ),
  false,
  'Interview UI must not modify recruitment status'
);

console.log(
  '✅ Recruitment status remains independent'
);


assert.strictEqual(
  panel.includes(
    'deleteApplication('
  ),
  false,
  'Legacy Application delete API must not be used'
);

console.log(
  '✅ Legacy delete API not used'
);


assert(
  panel.includes(
    'fetchApplicantInterviews'
  )
);

assert(
  panel.includes(
    'createApplicantInterview'
  )
);

assert(
  panel.includes(
    'completeApplicantInterview'
  )
);

console.log(
  '✅ Interview panel connected to API client'
);


console.log(
  '\nINTERVIEW MANAGEMENT FRONTEND CONTRACT TEST PASSED'
);
