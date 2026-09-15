'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const preview =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantDocumentPreviewModal.tsx',
    'utf8'
  );

const panel =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantDocumentsPanel.tsx',
    'utf8'
  );

const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );


assert.ok(
  preview.includes(
    'provider === "external"'
  ),
  'Preview must detect external documents.'
);


assert.ok(
  preview.includes(
    'provider === "s3"'
  ),
  'Preview must distinguish S3 documents.'
);


const externalGuardMatch =
  preview.match(
    /if\s*\(\s*isExternal\s*\)\s*\{/
  );

const blobFetchIndex =
  preview.indexOf(
    'await fetchApplicantDocumentBlob'
  );

assert.ok(
  externalGuardMatch,
  'Preview must contain an external-provider guard.'
);

assert.ok(
  blobFetchIndex !== -1,
  'Local preview must still support Blob fetching.'
);

assert.ok(
  externalGuardMatch.index <
    blobFetchIndex,
  'Remote-provider guard must execute before Blob fetching.'
);


assert.ok(
  preview.includes(
    'Open Original Document'
  ),
  'External documents need a safe Open Original action.'
);


assert.ok(
  /item\.storage\.provider\s*===\s*"external"/
    .test(panel),
  'Applicant panel must bypass Blob preview for external documents.'
);


const downloadStart =
  api.indexOf(
    'export const downloadApplicantDocumentFile'
  );

assert.ok(
  downloadStart !== -1,
  'Download helper must exist.'
);


const downloadSection =
  api.slice(
    downloadStart,
    downloadStart + 1800
  );

assert.ok(
  downloadSection.includes(
    'applicantDocumentDownloadUrl'
  ),
  'Download helper must use protected backend URL.'
);


const downloadUrlStart =
  api.indexOf(
    'export const applicantDocumentDownloadUrl'
  );

assert.ok(
  downloadUrlStart !== -1,
  'Applicant document download URL helper must exist.'
);

const downloadUrlSection =
  api.slice(
    downloadUrlStart,
    downloadUrlStart + 1300
  );

assert.ok(
  downloadUrlSection.includes(
    'import.meta.env.VITE_API_URL'
  ),
  'Browser document navigation must use VITE_API_URL.'
);

assert.ok(
  downloadUrlSection.includes(
    'http://localhost:5000/api'
  ),
  'Browser document navigation must retain the development backend fallback.'
);

assert.ok(
  !downloadUrlSection.includes(
    '=>\n  `/api/applicants/'
  ),
  'Document navigation must not use a frontend-relative /api URL.'
);


assert.ok(
  !downloadSection.includes(
    'fetchApplicantDocumentBlob('
  ),
  'Download helper must not use Axios Blob fetching.'
);


assert.ok(
  downloadSection.includes(
    'noopener noreferrer'
  ),
  'External navigation must prevent opener access.'
);


console.log(
  '✅ external documents bypass Axios Blob preview'
);

console.log(
  '✅ S3 remote redirects handled separately'
);

console.log(
  '✅ external View opens protected backend route'
);

console.log(
  '✅ downloads use browser navigation instead of CORS-sensitive XHR'
);

console.log(
  '✅ safe noopener/noreferrer navigation'
);

console.log(
  '\\nAPPLICANT EXTERNAL DOCUMENT FRONTEND TEST PASSED'
);
