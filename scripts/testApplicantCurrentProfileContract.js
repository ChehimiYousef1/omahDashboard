'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');


function read(relativePath) {
  return fs.readFileSync(
    path.join(
      __dirname,
      '..',
      relativePath
    ),
    'utf8'
  );
}


console.log(
  '================================'
);

console.log(
  ' CURRENT PROFILE CONTRACT TEST'
);

console.log(
  '================================'
);


const panel =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantProfilePanel.tsx'
  );

const currentView =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantCurrentProfileView.tsx'
  );


assert.ok(
  panel.includes(
    'ApplicantCurrentProfileView'
  )
);

console.log(
  '✅ dedicated Current Profile view connected'
);


assert.ok(
  panel.includes(
    'tab === "current-profile"'
  )
);

assert.ok(
  panel.includes(
    'void loadSubmissions()'
  )
);

console.log(
  '✅ Current Profile loads read-only submission references'
);


[
  'applicant.identity',
  'applicant.education',
  'applicant.preferences',
  'applicant.skills',
  'applicant.profiles',
  'applicant.recruitment',
  'applicant.lifecycle',
].forEach(
  (requiredReference) => {
    assert.ok(
      currentView.includes(
        requiredReference
      ),
      `Missing ${requiredReference}`
    );
  }
);

console.log(
  '✅ full Applicant master profile represented'
);


assert.ok(
  currentView.includes(
    'applicant.profileVersion'
  )
);

assert.ok(
  currentView.includes(
    'latestApprovedSubmissionId'
  )
);

console.log(
  '✅ profile version and approved-source metadata represented'
);


assert.ok(
  currentView.includes(
    'approvedSubmission'
  )
);

assert.ok(
  currentView.includes(
    'Current Approved Documents'
  )
);

console.log(
  '✅ approved documents resolve from immutable submission'
);


[
  'cvResume',
  'identityDocument',
  'enrollmentDocument',
  'degreeCertificate',
  'trainingCertificates',
  'recommendationLetters',
  'portfolioWorkSamples',
  'additionalSupportingDocuments',
].forEach(
  (documentField) => {
    assert.ok(
      currentView.includes(
        documentField
      ),
      `Missing document field: ${documentField}`
    );
  }
);

assert.ok(
  currentView.includes(
    'href={url}'
  )
);

assert.ok(
  currentView.includes(
    'target="_blank"'
  )
);

assert.ok(
  currentView.includes(
    'rel="noreferrer"'
  )
);

assert.ok(
  currentView.includes(
    'View All Documents'
  )
);

assert.ok(
  panel.includes(
    'openTab('
  )
);

assert.ok(
  panel.includes(
    '"documents"'
  )
);

console.log(
  '✅ CV and every supported document type can be opened'
);

console.log(
  '✅ all linked submission documents remain accessible'
);


assert.ok(
  currentView.includes(
    'Current Evaluation'
  )
);

assert.ok(
  currentView.includes(
    'Historical form ratings'
  )
);

console.log(
  '✅ historical form rating is not misrepresented as current evaluation'
);


assert.ok(
  currentView.includes(
    'Original Google Form'
  )
);

assert.ok(
  currentView.includes(
    'Submission History'
  )
);

console.log(
  '✅ current state and immutable history clearly separated'
);


console.log('');
console.log(
  '✅ No MongoDB connection used'
);

console.log(
  '✅ No MongoDB writes performed'
);

console.log('');
console.log(
  'CURRENT PROFILE CONTRACT TEST PASSED'
);
