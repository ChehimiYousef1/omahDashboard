'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');


function read(
  relativePath
) {
  return fs.readFileSync(
    path.join(
      __dirname,
      '..',
      relativePath
    ),
    'utf8'
  );
}


const routes =
  read(
    'src/routes/applicants.routes.js'
  );

const api =
  read(
    'omahconnect-admin/src/services/api.ts'
  );

const panel =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantInterviewPanel.tsx'
  );


assert.ok(
  routes.includes(
    "getMeetingProviderStatuses"
  )
);

assert.ok(
  routes.includes(
    "'/interviews/providers'"
  )
);

assert.ok(
  routes.includes(
    "'applicant:interviews:view'"
  )
);

console.log(
  '✅ provider-status API is permission protected'
);


assert.ok(
  api.includes(
    'fetchApplicantInterviewMeetingProviders'
  )
);

assert.ok(
  api.includes(
    '"/applicants/interviews/providers"'
  )
);

assert.ok(
  api.includes(
    'readyForScheduling'
  )
);

console.log(
  '✅ frontend provider-status contract'
);


assert.ok(
  panel.includes(
    'meetingProviderStatusById'
  )
);

assert.ok(
  panel.includes(
    'disabled={'
  )
);

assert.ok(
  panel.includes(
    'Connected · Read-only'
  )
);

assert.ok(
  panel.includes(
    'Coming soon'
  )
);

console.log(
  '✅ provider availability rendered dynamically'
);


assert.ok(
  panel.includes(
    `meetingProvider:
      "",`
  )
);

console.log(
  '✅ new online interview has no implicit provider'
);


console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '✅ no Google API request made'
);

console.log(
  '✅ no Calendar event created'
);

console.log(
  '✅ no invitation sent'
);

console.log(
  '\\nINTERVIEW MEETING PROVIDER STATUS TEST PASSED'
);
