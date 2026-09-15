'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

function source(
  path
) {
  return fs.readFileSync(
    path,
    'utf8'
  );
}


const page =
  source(
    'omahconnect-admin/src/pages/ApplicationsPage.tsx'
  );

assert(
  page.includes(
    'Delete Applicant Permanently'
  )
);

assert(
  page.includes(
    'handlePermanentDelete'
  )
);

assert(
  page.includes(
    'confirmation !=='
  )
);

assert(
  page.includes(
    '"DELETE"'
  )
);

console.log(
  '✅ archived Applicant permanent-delete UI present'
);


const currentProfile =
  source(
    'omahconnect-admin/src/components/applicants/ApplicantCurrentProfileView.tsx'
  );

assert.strictEqual(
  currentProfile.includes(
    'href={url}'
  ),
  false
);

assert(
  currentProfile.includes(
    'Managed document access is available from the Documents tab.'
  )
);

console.log(
  '✅ approved profile no longer exposes raw Form URLs'
);


const center =
  source(
    'omahconnect-admin/src/components/applicants/analytics/ApplicantDocumentManagementCenter.tsx'
  );

assert.strictEqual(
  /window\.open\(\s*url\s*,/m.test(
    center
  ),
  false
);

assert(
  center.includes(
    'Managed Copy Unavailable'
  )
);

assert(
  center.includes(
    'isUnavailableFormExternalVersion'
  )
);

console.log(
  '✅ central library no longer opens raw Form URLs'
);


const panel =
  source(
    'omahconnect-admin/src/components/applicants/ApplicantDocumentsPanel.tsx'
  );

assert(
  panel.includes(
    'isUnavailableFormExternalDocument'
  )
);

assert(
  panel.includes(
    'does not have an OMAH-managed copy yet'
  )
);

console.log(
  '✅ Applicant Documents blocks unavailable Form external records'
);


const formSection =
  source(
    'omahconnect-admin/src/components/applicants/ApplicantFormDocumentsSection.tsx'
  );

assert.strictEqual(
  formSection.includes(
    'href={item.url}'
  ),
  false
);

assert.strictEqual(
  /window\.open\([\s\S]{0,180}?item\.url/.test(
    formSection
  ),
  false
);

console.log(
  '✅ Original Form Documents has no direct raw URL action'
);

console.log(
  '\nSAFE DELETE + DOCUMENT FRONTEND POLICY TEST PASSED'
);
