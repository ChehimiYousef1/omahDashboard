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

const actions =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantReportExportActions.tsx',
    'utf8'
  );

const profile =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantProfilePanel.tsx',
    'utf8'
  );

const runner =
  fs.readFileSync(
    'scripts/testApplicantDashboardFullRegression.sh',
    'utf8'
  );


assert.ok(
  api.includes(
    'ApplicantReportExportKind'
  ),
  'Applicant report type missing'
);

assert.ok(
  api.includes(
    'downloadApplicantReportPdf'
  ),
  'Applicant report download helper missing'
);

assert.ok(
  api.includes(
    'downloadApplicantSummaryReport'
  ),
  'Summary report helper missing'
);

assert.ok(
  api.includes(
    'downloadApplicantRecruitmentReport'
  ),
  'Recruitment report helper missing'
);

assert.ok(
  api.includes(
    '/reports/${kind}.pdf'
  ),
  'Protected report endpoint pattern missing'
);

assert.ok(
  api.includes(
    'responseType:'
  ) &&
  api.includes(
    '"blob"'
  ),
  'Report export must download as Blob'
);

assert.ok(
  api.includes(
    'content-disposition'
  ),
  'Server report filename is not consumed'
);

assert.ok(
  api.includes(
    'application/pdf'
  ),
  'PDF response validation missing'
);

assert.ok(
  api.includes(
    'URL.createObjectURL'
  ),
  'Browser Blob URL creation missing'
);

assert.ok(
  api.includes(
    'URL.revokeObjectURL'
  ),
  'Browser Blob URL cleanup missing'
);


assert.ok(
  actions.includes(
    'Summary PDF'
  ),
  'Summary PDF action missing'
);

assert.ok(
  actions.includes(
    'Recruitment PDF'
  ),
  'Recruitment PDF action missing'
);

assert.ok(
  actions.includes(
    'downloadApplicantSummaryReport'
  ),
  'Summary export is not wired'
);

assert.ok(
  actions.includes(
    'downloadApplicantRecruitmentReport'
  ),
  'Recruitment export is not wired'
);

assert.ok(
  actions.includes(
    'Loader2'
  ),
  'Export loading indicator missing'
);

assert.ok(
  actions.includes(
    'disabled='
  ),
  'Concurrent export protection missing'
);

assert.ok(
  actions.includes(
    'role="alert"'
  ),
  'Export error feedback missing'
);

assert.strictEqual(
  actions.includes(
    'window.open('
  ),
  false,
  'Report export should use authenticated Blob download, not window.open'
);


assert.ok(
  profile.includes(
    'ApplicantReportExportActions'
  ),
  'Applicant Profile does not import export actions'
);

assert.ok(
  profile.includes(
    'applicantId={'
  ),
  'Applicant id not supplied to report actions'
);


assert.ok(
  api.includes(
    'withCredentials: true'
  ),
  'Frontend API client must preserve authenticated cookies'
);


assert.ok(
  runner.includes(
    'testApplicantReportExportFrontend.js'
  ),
  'Frontend report export test missing from full regression'
);


console.log(
  '✅ authenticated Applicant report Blob helper'
);

console.log(
  '✅ Summary PDF frontend action'
);

console.log(
  '✅ Recruitment PDF frontend action'
);

console.log(
  '✅ server attachment filename preserved'
);

console.log(
  '✅ loading/concurrency state'
);

console.log(
  '✅ export error feedback'
);

console.log(
  '✅ Applicant Profile integration'
);

console.log(
  '✅ authenticated cookie transport preserved'
);

console.log(
  '\nAPPLICANT REPORT EXPORT FRONTEND TEST PASSED'
);
