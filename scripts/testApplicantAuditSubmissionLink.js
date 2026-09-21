'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const {
  buildApplicantActivity,
} = require(
  '../services/applicantActivityService'
);


const source =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );


const startMarker =
  "  router.post(\n    '/:id/submissions/:submissionId/link',";

const endMarker =
  "  router.get(\n    '/:id/relationship-integrity',";


const start =
  source.indexOf(
    startMarker
  );

const end =
  source.indexOf(
    endMarker,
    start
  );


assert(
  start >= 0,
  'Submission-link route missing'
);

assert(
  end > start,
  'Submission-link route boundary missing'
);


const block =
  source.slice(
    start,
    end
  );


/*
|--------------------------------------------------------------------------
| Event wiring
|--------------------------------------------------------------------------
*/

assert(
  block.includes(
    "'submission.linked'"
  ),
  'submission.linked event missing'
);

assert(
  block.includes(
    'recordApplicantActivitySafely'
  ),
  'Safe Audit writer missing'
);

assert(
  block.includes(
    'applicantRequestActor'
  ),
  'Audit actor missing'
);

assert(
  block.includes(
    "type:\n                'submission'"
  ),
  'Submission Audit source missing'
);


/*
|--------------------------------------------------------------------------
| Only real mutation is audited
|--------------------------------------------------------------------------
*/

assert(
  block.includes(
    "result?.status ===\n          'linked'"
  ),
  'Submission-link Audit must be guarded by linked status'
);

assert(
  block.includes(
    "'submission.applicantId'"
  ),
  'Submission relationship before/after missing'
);

assert(
  block.includes(
    'before:\n                  null'
  ),
  'Submission relationship previous state missing'
);

assert(
  block.includes(
    'result\n                    ?.applicantId'
  ),
  'Submission relationship next state missing'
);


/*
|--------------------------------------------------------------------------
| HTTP contract remains unchanged
|--------------------------------------------------------------------------
*/

assert(
  block.includes(
    'success: true'
  )
);

assert(
  block.includes(
    'result,'
  )
);


/*
|--------------------------------------------------------------------------
| Activity service accepts the event
|--------------------------------------------------------------------------
*/

const event =
  buildApplicantActivity({
    applicantId:
      '507f1f77bcf86cd799439011',

    type:
      'submission.linked',

    title:
      'Submission linked to Applicant',

    source: {
      type:
        'submission',

      id:
        '507f1f77bcf86cd799439013',
    },

    changes: [
      {
        field:
          'submission.applicantId',

        label:
          'Linked Applicant',

        before:
          null,

        after:
          '507f1f77bcf86cd799439011',
      },
    ],
  });


assert.strictEqual(
  event.category,
  'submission'
);

assert.strictEqual(
  event.type,
  'submission.linked'
);

assert.strictEqual(
  event.changes.length,
  1
);


console.log(
  '✅ submission.linked event wired'
);

console.log(
  '✅ relationship before → after captured'
);

console.log(
  '✅ already-linked state does not create another event'
);

console.log(
  '✅ actor + Submission source attached'
);

console.log(
  '✅ HTTP response preserved'
);

console.log(
  '✅ submission Audit category preserved'
);

console.log(
  '\nAPPLICANT AUDIT B3C1 TEST PASSED'
);
