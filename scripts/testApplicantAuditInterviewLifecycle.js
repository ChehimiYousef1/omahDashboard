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


const markers = {
  create:
    "  router.post(\n    '/:id/interviews',",

  edit:
    "  router.patch(\n    '/:id/interviews/:interviewId',",

  complete:
    "  router.post(\n    '/:id/interviews/:interviewId/complete',",

  cancel:
    "  router.post(\n    '/:id/interviews/:interviewId/cancel',",

  noShow:
    "  router.post(\n    '/:id/interviews/:interviewId/no-show',",

  permanent:
    "  router.delete(\n    '/:id/interviews/:interviewId/permanent',",

  archive:
    "  router.delete(\n    '/:id/interviews/:interviewId',",

  communications:
    "  router.get(\n    '/communications/providers',",
};


function section(
  startMarker,
  endMarker
) {
  const start =
    source.indexOf(
      startMarker
    );

  assert(
    start >= 0,
    'Missing start marker'
  );

  const end =
    source.indexOf(
      endMarker,
      start +
        startMarker.length
    );

  assert(
    end > start,
    'Missing end marker'
  );

  return source.slice(
    start,
    end
  );
}


const create =
  section(
    markers.create,
    markers.edit
  );

const complete =
  section(
    markers.complete,
    markers.cancel
  );

const cancel =
  section(
    markers.cancel,
    markers.noShow
  );

const noShow =
  section(
    markers.noShow,
    markers.permanent
  );

const permanent =
  section(
    markers.permanent,
    markers.archive
  );

const archive =
  section(
    markers.archive,
    markers.communications
  );


const contracts = [
  {
    block:
      create,

    event:
      "'interview.created'",

    change:
      "'interview.exists'",
  },

  {
    block:
      complete,

    event:
      "'interview.completed'",

    change:
      "'completed'",
  },

  {
    block:
      cancel,

    event:
      "'interview.cancelled'",

    change:
      "'cancelled'",
  },

  {
    block:
      noShow,

    event:
      "'interview.no_show'",

    change:
      "'no_show'",
  },

  {
    block:
      permanent,

    event:
      "'interview.deleted_permanently'",

    change:
      "'interview.exists'",
  },

  {
    block:
      archive,

    event:
      "'interview.archived'",

    change:
      "'interview.archived'",
  },
];


for (
  const contract
  of contracts
) {
  assert(
    contract.block.includes(
      contract.event
    ),
    'Missing event: ' +
      contract.event
  );

  assert(
    contract.block.includes(
      contract.change
    ),
    'Missing change: ' +
      contract.change
  );

  assert(
    contract.block.includes(
      'recordApplicantActivitySafely'
    ),
    'Safe activity writer missing'
  );

  assert(
    contract.block.includes(
      'applicantRequestActor'
    ),
    'Actor missing'
  );

  assert(
    contract.block.includes(
      "type:\n              'interview'"
    ),
    'Interview source missing'
  );
}


assert(
  cancel.includes(
    'cancellationReason'
  )
);

assert(
  archive.includes(
    'archiveReason'
  )
);


/*
|--------------------------------------------------------------------------
| B3A2 edit/reschedule deliberately untouched
|--------------------------------------------------------------------------
*/

const edit =
  section(
    markers.edit,
    markers.complete
  );

assert.strictEqual(
  edit.includes(
    "'interview.updated'"
  ),
  false,
  'B3A1 must not implement edit history'
);


/*
|--------------------------------------------------------------------------
| Long-form/provider internals excluded from structured audit fields
|--------------------------------------------------------------------------
*/

const lifecycle =
  contracts
    .map(
      contract =>
        contract.block
    )
    .join('\n');

for (
  const forbidden
  of [
    "'interview.feedback'",
    "'interview.notes'",
    "'interview.meetingLink'",
    "'interview.providerEventId'",
  ]
) {
  assert.strictEqual(
    lifecycle.includes(
      forbidden
    ),
    false,
    'Forbidden structured audit field: ' +
      forbidden
  );
}


/*
|--------------------------------------------------------------------------
| ApplicantActivity category inference
|--------------------------------------------------------------------------
*/

const event =
  buildApplicantActivity({
    applicantId:
      '507f1f77bcf86cd799439011',

    type:
      'interview.completed',

    title:
      'Interview completed',

    source: {
      type:
        'interview',

      id:
        '507f1f77bcf86cd799439012',
    },

    changes: [
      {
        field:
          'interview.status',

        label:
          'Interview status',

        before:
          'scheduled',

        after:
          'completed',
      },
    ],
  });


assert.strictEqual(
  event.category,
  'interview'
);

assert.strictEqual(
  event.changes.length,
  1
);


/*
|--------------------------------------------------------------------------
| Existing Audit API unchanged
|--------------------------------------------------------------------------
*/

const swagger =
  require(
    '../docs/applicantSwagger'
  );

assert.deepStrictEqual(
  swagger.paths[
    '/api/applicants/{id}/audit'
  ].get.tags,
  [
    'Applicant Audit & History'
  ]
);


console.log(
  '✅ interview created'
);

console.log(
  '✅ interview completed'
);

console.log(
  '✅ interview cancelled'
);

console.log(
  '✅ interview no-show'
);

console.log(
  '✅ interview archived'
);

console.log(
  '✅ interview permanently deleted'
);

console.log(
  '✅ edit/reschedule reserved for B3A2'
);

console.log(
  '✅ actor and source attached'
);

console.log(
  '✅ long-form/provider fields excluded'
);

console.log(
  '✅ Applicant Audit & History preserved'
);

console.log(
  '\nAPPLICANT AUDIT B3A1 TEST PASSED'
);
