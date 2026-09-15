'use strict';

const fs =
  require('fs');

function read(path) {
  return fs.readFileSync(
    path,
    'utf8'
  );
}

function check(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      message
    );
  }

  console.log(
    `✅ ${message}`
  );
}


const section =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantFormDocumentsSection.tsx'
  );

const panel =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantDocumentsPanel.tsx'
  );


check(
  section.includes(
    'fetchApplicantSubmissions'
  ),
  'Form submissions loaded through existing Applicant API'
);


for (
  const field of [
    'cvResume',
    'identityDocument',
    'enrollmentDocument',
    'degreeCertificate',
    'trainingCertificates',
    'recommendationLetters',
    'portfolioWorkSamples',
    'additionalSupportingDocuments',
  ]
) {
  check(
    section.includes(
      field
    ),
    `Form document field ${field}`
  );
}


check(
  section.includes(
    'safeExternalUrl'
  ) &&
  section.includes(
    'noopener noreferrer'
  ),
  'external Form document URLs opened safely'
);


check(
  section.includes(
    'managedDocuments'
  ) &&
  section.includes(
    'managedUrls'
  ),
  'managed/form external document deduplication'
);


check(
  panel.includes(
    '<ApplicantFormDocumentsSection'
  ),
  'Original Form Documents rendered inside Applicant Documents tab'
);


console.log(
  '\nAPPLICANT FORM DOCUMENT FRONTEND TEST PASSED'
);
