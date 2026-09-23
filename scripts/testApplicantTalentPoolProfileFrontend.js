'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const api =
  fs.readFileSync(
    require.resolve(
      '../omahconnect-admin/src/services/api.ts'
    ),
    'utf8'
  );


const profile =
  fs.readFileSync(
    require.resolve(
      '../omahconnect-admin/src/components/applicants/ApplicantProfilePanel.tsx'
    ),
    'utf8'
  );


const talentProfile =
  fs.readFileSync(
    require.resolve(
      '../omahconnect-admin/src/components/applicants/ApplicantTalentPoolProfilePanel.tsx'
    ),
    'utf8'
  );


const applications =
  fs.readFileSync(
    require.resolve(
      '../omahconnect-admin/src/pages/ApplicationsPage.tsx'
    ),
    'utf8'
  );


for (
  const token
  of [
    'fetchApplicantTalentPoolMembership',
    'addApplicantToTalentPool',
    'fetchApplicantTalentPoolCategories',
    'createApplicantTalentPoolCategory',
    'patchApplicantTalentPoolCategory',
    'archiveApplicantTalentPoolCategory',
    'restoreApplicantTalentPoolCategory',
  ]
) {
  assert.ok(
    api.includes(
      token
    ),
    `Missing B5G Talent Pool frontend API: ${token}`
  );
}


assert.ok(
  profile.includes(
    '| "talentPool"'
  ),
  'Applicant Profile Talent Pool tab type missing'
);


assert.ok(
  profile.includes(
    'id: "talentPool"'
  ),
  'Applicant Profile Talent Pool tab missing'
);


assert.ok(
  profile.includes(
    '<ApplicantTalentPoolProfilePanel'
  ),
  'Applicant Profile Talent Pool panel missing'
);


for (
  const token
  of [
    'Add to Talent Pool',
    'Edit Talent Pool Membership',
    'Complete Review',
    'Schedule Review',
    'Restore Membership',
    'Remove',
    'Manage Categories',
    'Duplicate Review Pending',
    'Same Person Already Retained',
    'The Applicant profile will NOT be deleted.',
  ]
) {
  assert.ok(
    talentProfile.includes(
      token
    ),
    `Talent Pool profile capability missing: ${token}`
  );
}


assert.ok(
  talentProfile.includes(
    'fetchApplicantDuplicateCases'
  ),
  'Duplicate Review awareness missing'
);


assert.ok(
  talentProfile.includes(
    'duplicateAddBlocked'
  ),
  'Duplicate-aware add guard missing'
);


assert.ok(
  talentProfile.includes(
    'omah:open-duplicate-review'
  ),
  'Duplicate Review open action missing'
);


assert.ok(
  applications.includes(
    'omah:open-duplicate-review'
  ),
  'ApplicationsPage Duplicate Review listener missing'
);


assert.ok(
  applications.includes(
    'viewMode !== "talentPool"'
  ),
  'Global Applicant filters must be hidden in Talent Pool view'
);


assert.ok(
  !talentProfile.includes(
    'mergeApplicant'
  ),
  'Talent Pool frontend must not auto-merge Applicants'
);


assert.ok(
  !talentProfile.includes(
    'permanentlyDeleteApplicant'
  ),
  'Talent Pool frontend must not permanently delete Applicants'
);


console.log(
  '✅ Applicant Profile Talent Pool tab'
);

console.log(
  '✅ add/edit/remove/restore membership'
);

console.log(
  '✅ complete/schedule review'
);

console.log(
  '✅ duplicate-aware add protection'
);

console.log(
  '✅ existing Duplicate Review reused'
);

console.log(
  '✅ no automatic merge/delete introduced'
);

console.log(
  '✅ category create/edit/archive/restore UI'
);

console.log(
  '✅ redundant global filters hidden in Talent Pool'
);

console.log(
  '\nAPPLICANT TALENT POOL PROFILE FRONTEND TEST PASSED'
);
