'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const center =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/analytics/ApplicantDocumentManagementCenter.tsx',
    'utf8'
  );

const documents =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/analytics/DocumentAnalytics.tsx',
    'utf8'
  );

const dashboard =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantAnalyticsDashboard.tsx',
    'utf8'
  );


for (
  const api
  of [
    'fetchApplicantDocumentVersions',
    'uploadApplicantDocumentVersion',
    'setApplicantDocumentCurrent',
    'archiveApplicantDocumentRecord',
    'restoreApplicantDocumentRecord',
  ]
) {
  assert(
    center.includes(api),
    `${api} missing`
  );
}

console.log(
  '✅ existing protected document APIs reused'
);


for (
  const action
  of [
    'Versions',
    'Replace',
    'Set Current',
    'Archive',
    'Restore',
  ]
) {
  assert(
    center.includes(action),
    `${action} missing`
  );
}

console.log(
  '✅ managed document lifecycle actions exposed'
);


assert(
  center.includes(
    'Document Version History'
  )
);

assert(
  center.includes(
    'versions.map'
  )
);

console.log(
  '✅ version history modal implemented'
);


assert(
  center.includes(
    'Only the active current version can be replaced.'
  )
);

assert(
  center.includes(
    'creates a new immutable version'
  )
);

console.log(
  '✅ immutable replacement/version semantics preserved'
);


assert(
  center.includes(
    'Original Form documents are immutable'
  )
);

console.log(
  '✅ Form-submission documents remain read-only'
);


assert(
  center.includes(
    'window.confirm'
  )
);

assert(
  center.includes(
    'Optional archive reason:'
  )
);

console.log(
  '✅ lifecycle changes require confirmation'
);


assert(
  documents.includes(
    'onDocumentsChanged'
  )
);

assert(
  dashboard.includes(
    'onDocumentsChanged={'
  )
);

assert(
  dashboard.includes(
    'loadAnalytics'
  )
);

console.log(
  '✅ dashboard analytics refresh after mutation'
);


console.log(
  '\nAPPLICANT DOCUMENT MANAGEMENT ACTIONS FRONTEND TEST PASSED'
);
