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
    "  router.post(\n    '/:id/evaluations',",

  update:
    "  router.patch(\n    '/:id/evaluations/:evaluationId',",

  submit:
    "  router.post(\n    '/:id/evaluations/:evaluationId/submit',",

  reopen:
    "  router.post(\n    '/:id/evaluations/:evaluationId/reopen',",

  archive:
    "  router.delete(\n    '/:id/evaluations/:evaluationId',",

  interviews:
    "  router.get(\n    '/interviews/providers',",
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
    'Missing route start'
  );

  const end =
    source.indexOf(
      endMarker,
      start +
        startMarker.length
    );

  assert(
    end > start,
    'Missing route boundary'
  );

  return source.slice(
    start,
    end
  );
}


const create =
  section(
    markers.create,
    markers.update
  );

const submit =
  section(
    markers.submit,
    markers.reopen
  );

const reopen =
  section(
    markers.reopen,
    markers.archive
  );

const archive =
  section(
    markers.archive,
    markers.interviews
  );


const contracts = [
  {
    block:
      create,

    event:
      "'evaluation.created'",

    field:
      "'evaluation.exists'",
  },

  {
    block:
      submit,

    event:
      "'evaluation.submitted'",

    field:
      "'evaluation.status'",
  },

  {
    block:
      reopen,

    event:
      "'evaluation.reopened'",

    field:
      "'evaluation.status'",
  },

  {
    block:
      archive,

    event:
      "'evaluation.archived'",

    field:
      "'evaluation.archived'",
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
    'Missing Evaluation event: ' +
      contract.event
  );

  assert(
    contract.block.includes(
      contract.field
    ),
    'Missing Evaluation structured field: ' +
      contract.field
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
    'Evaluation actor missing'
  );

  assert(
    contract.block.includes(
      "type:\n              'evaluation'"
    ),
    'Evaluation source missing'
  );
}


/*
|--------------------------------------------------------------------------
| Deterministic lifecycle transitions
|--------------------------------------------------------------------------
*/

assert(
  submit.includes(
    "before:\n                'draft'"
  )
);

assert(
  submit.includes(
    "after:\n                'submitted'"
  )
);

assert(
  reopen.includes(
    "before:\n                'submitted'"
  )
);

assert(
  reopen.includes(
    "after:\n                'draft'"
  )
);

assert(
  archive.includes(
    "before:\n                false"
  )
);

assert(
  archive.includes(
    "after:\n                true"
  )
);


/*
|--------------------------------------------------------------------------
| Safe creation metadata
|--------------------------------------------------------------------------
*/

assert(
  create.includes(
    'weightedScore'
  )
);

assert(
  create.includes(
    'averageRating'
  )
);

assert(
  create.includes(
    'recommendation'
  )
);


/*
|--------------------------------------------------------------------------
| Free-text Evaluation content is never a structured Audit field
|--------------------------------------------------------------------------
*/

const lifecycle =
  contracts
    .map(
      item =>
        item.block
    )
    .join('\n');

for (
  const forbidden
  of [
    "'evaluation.strengths'",
    "'evaluation.concerns'",
    "'evaluation.summary'",
    "'evaluation.archiveReason'",
  ]
) {
  assert.strictEqual(
    lifecycle.includes(
      forbidden
    ),
    false,
    'Free-text Evaluation field leaked into structured Audit: ' +
      forbidden
  );
}


assert(
  archive.includes(
    'archiveReasonProvided'
  ),
  'Archive reason-presence metadata missing'
);


/*
|--------------------------------------------------------------------------
| Category inference
|--------------------------------------------------------------------------
*/

const event =
  buildApplicantActivity({
    applicantId:
      '507f1f77bcf86cd799439011',

    type:
      'evaluation.submitted',

    title:
      'Applicant evaluation submitted',

    source: {
      type:
        'evaluation',

      id:
        '507f1f77bcf86cd799439012',
    },

    changes: [
      {
        field:
          'evaluation.status',

        label:
          'Evaluation status',

        before:
          'draft',

        after:
          'submitted',
      },
    ],
  });


assert.strictEqual(
  event.category,
  'evaluation'
);

assert.strictEqual(
  event.changes.length,
  1
);


/*
|--------------------------------------------------------------------------
| Existing Audit API remains unchanged
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
  '✅ evaluation created audit'
);

console.log(
  '✅ evaluation submitted audit'
);

console.log(
  '✅ evaluation reopened audit'
);

console.log(
  '✅ evaluation archived audit'
);

console.log(
  '✅ deterministic lifecycle transitions'
);

console.log(
  '✅ safe scoring metadata on creation'
);

console.log(
  '✅ free-text Evaluation content excluded'
);

console.log(
  '✅ actor + Evaluation source attached'
);

console.log(
  '✅ Applicant Audit & History preserved'
);

console.log(
  '\nAPPLICANT AUDIT B3B1 TEST PASSED'
);
