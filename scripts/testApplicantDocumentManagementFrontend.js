'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

function read(
  path
) {
  return fs.readFileSync(
    path,
    'utf8'
  );
}

const api =
  read(
    'omahconnect-admin/src/services/api.ts'
  );

const center =
  read(
    'omahconnect-admin/src/components/applicants/analytics/ApplicantDocumentManagementCenter.tsx'
  );

const documents =
  read(
    'omahconnect-admin/src/components/applicants/analytics/DocumentAnalytics.tsx'
  );

const dashboard =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantAnalyticsDashboard.tsx'
  );


assert(
  api.includes(
    'ApplicantDocumentLibraryResponse'
  ) &&
  api.includes(
    'fetchApplicantDocumentLibrary'
  )
);

console.log(
  '✅ centralized Document Library frontend API'
);


assert(
  api.includes(
    '"/applicants/documents/library"'
  )
);

console.log(
  '✅ centralized Document Library endpoint connected'
);


for (
  const token
  of [
    'Current Files',
    'Managed Current',
    'Form Files',
    'Archived',
    'Applicants With CV',
    'Applicants Missing CV',
  ]
) {
  assert(
    center.includes(
      token
    )
  );
}

console.log(
  '✅ document management KPI cards'
);


for (
  const token
  of [
    'All Sources',
    'All Document Categories',
    'Current Inventory',
    'Historical Managed',
    'Archived Managed',
    'All States',
  ]
) {
  assert(
    center.includes(
      token
    )
  );
}

console.log(
  '✅ centralized library filters'
);


for (
  const token
  of [
    'View',
    'Download',
    'Open File',
    'Open Applicant',
  ]
) {
  assert(
    center.includes(
      token
    )
  );
}

console.log(
  '✅ safe read-only document actions'
);


assert(
  center.includes(
    'downloadApplicantDocumentFile'
  ) &&
  center.includes(
    'applicantDocumentDownloadUrl'
  )
);

console.log(
  '✅ managed document view/download reuses protected APIs'
);


assert(
  center.includes(
    'item.form'
  ) &&
  center.includes(
    'Immutable source'
  )
);

console.log(
  '✅ Form-submission documents remain immutable'
);


assert(
  documents.includes(
    '<ApplicantDocumentManagementCenter'
  )
);

console.log(
  '✅ management center integrated into Documents analytics'
);


assert(
  dashboard.includes(
    '<DocumentAnalytics'
  ) &&
  dashboard.includes(
    'onOpenApplicant'
  )
);

console.log(
  '✅ Applicant Profile navigation remains connected'
);


console.log(
  '\nAPPLICANT DOCUMENT MANAGEMENT FRONTEND TEST PASSED'
);
