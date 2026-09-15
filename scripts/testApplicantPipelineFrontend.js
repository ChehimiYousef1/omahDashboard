'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


function read(path) {
  return fs.readFileSync(
    path,
    'utf8'
  );
}


const api =
  read(
    'omahconnect-admin/src/services/api.ts'
  );

const page =
  read(
    'omahconnect-admin/src/pages/ApplicationsPage.tsx'
  );

const profile =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantProfilePanel.tsx'
  );

const filters =
  read(
    'omahconnect-admin/src/components/applicants/AdvancedApplicantFilters.tsx'
  );

const board =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantPipelineBoard.tsx'
  );


assert.ok(
  api.includes(
    '| "shortlisted"'
  )
);

assert.ok(
  api.includes(
    '| "offered"'
  )
);

assert.ok(
  api.includes(
    'fetchApplicantPipeline'
  )
);

console.log(
  '✅ frontend supports all canonical pipeline stages'
);


assert.ok(
  !page.includes(
    'const STATUS_TRANSITIONS'
  )
);

assert.ok(
  !filters.includes(
    'const STATUS_LABELS'
  )
);

console.log(
  '✅ duplicated frontend pipeline rules removed'
);


assert.ok(
  page.includes(
    '<ApplicantPipelineBoard'
  )
);

assert.ok(
  page.includes(
    '"pipeline"'
  )
);

console.log(
  '✅ pipeline view integrated into Applicants page'
);


assert.ok(
  board.includes(
    'draggable='
  )
);

assert.ok(
  board.includes(
    'onDrop='
  )
);

assert.ok(
  /pipeline\s*\.transitions/.test(
    board
  )
);

assert.ok(
  board.includes(
    '<select'
  )
);

console.log(
  '✅ drag and controlled move actions implemented'
);


assert.ok(
  !profile.includes(
    'New status: applied'
  )
);

assert.ok(
  profile.includes(
    'pipeline'
  )
);

assert.ok(
  profile.includes(
    'transitions'
  )
);

console.log(
  '✅ profile status action uses canonical transitions'
);


console.log(
  'APPLICANT PIPELINE FRONTEND CONTRACT TEST PASSED'
);
