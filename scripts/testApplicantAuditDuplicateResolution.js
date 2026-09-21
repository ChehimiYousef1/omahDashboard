'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');

const {
  APPLICANT_ACTIVITY_CATEGORIES,
  APPLICANT_ACTIVITY_TYPES,
} = require(
  '../utils/applicantActivity'
);

const {
  buildDuplicateResolutionAuditChanges,
  resolveDuplicateCase,
} = require(
  '../services/applicantDuplicateCaseService'
);

const {
  buildApplicantActivity,
} = require(
  '../services/applicantActivityService'
);


const APPLICANT_A =
  new mongoose.Types.ObjectId();

const APPLICANT_B =
  new mongoose.Types.ObjectId();

const CASE_ID =
  new mongoose.Types.ObjectId();


/*
|--------------------------------------------------------------------------
| Registry
|--------------------------------------------------------------------------
*/

assert(
  APPLICANT_ACTIVITY_CATEGORIES.includes(
    'duplicate'
  )
);

assert(
  APPLICANT_ACTIVITY_TYPES.includes(
    'duplicate.resolved'
  )
);

console.log(
  '✅ duplicate Audit category registered'
);

console.log(
  '✅ duplicate.resolved registered'
);


/*
|--------------------------------------------------------------------------
| Pure before → after change builder
|--------------------------------------------------------------------------
*/

const changes =
  buildDuplicateResolutionAuditChanges({
    previous: {
      status:
        'under_review',

      resolution: {
        decision:
          'pending',

        notes:
          'Old private notes',
      },
    },

    updated: {
      status:
        'resolved',

      resolution: {
        decision:
          'same_person',

        notes:
          'Private resolution notes',
      },
    },
  });


assert.deepStrictEqual(
  changes.map(
    change =>
      change.field
  ),
  [
    'duplicate.status',
    'duplicate.resolution.decision',
  ]
);

assert.strictEqual(
  changes.some(
    change =>
      change.field.includes(
        'notes'
      )
  ),
  false
);

assert.strictEqual(
  JSON.stringify(
    changes
  ).includes(
    'Private resolution notes'
  ),
  false
);

console.log(
  '✅ status before → resolved captured'
);

console.log(
  '✅ decision before → after captured'
);

console.log(
  '✅ notes content excluded'
);


/*
|--------------------------------------------------------------------------
| Optional Audit-mode service contract
|--------------------------------------------------------------------------
*/

async function auditModeTest() {
  const previous = {
    _id:
      CASE_ID,

    sourceApplicantId:
      APPLICANT_A,

    candidateApplicantId:
      APPLICANT_B,

    status:
      'under_review',

    resolution: {
      decision:
        'pending',
    },
  };


  const resolvedAt =
    new Date(
      '2026-09-21T12:00:00.000Z'
    );


  const updated = {
    _id:
      CASE_ID,

    sourceApplicantId:
      APPLICANT_A,

    candidateApplicantId:
      APPLICANT_B,

    status:
      'resolved',

    resolution: {
      decision:
        'same_person',

      resolvedAt,

      resolvedBy:
        'admin-test',

      notes:
        'Reviewed manually.',

      survivorApplicantId:
        null,

      mergedApplicantId:
        null,
    },
  };


  let findOneOptions =
    null;

  let findByIdCount =
    0;


  const DuplicateCaseModel = {
    findOneAndUpdate(
      filter,
      mutation,
      options
    ) {
      findOneOptions =
        options;

      assert.strictEqual(
        filter.status.$ne,
        'resolved'
      );

      assert.strictEqual(
        mutation
          .$set
          .status,
        'resolved'
      );

      return {
        async lean() {
          return previous;
        },
      };
    },

    findById() {
      findByIdCount +=
        1;

      return {
        async lean() {
          return updated;
        },
      };
    },
  };


  const ApplicantModel = {
    find() {
      return {
        async lean() {
          return [
            {
              _id:
                APPLICANT_A,

              identity: {
                fullName:
                  'Applicant A',
              },
            },
            {
              _id:
                APPLICANT_B,

              identity: {
                fullName:
                  'Applicant B',
              },
            },
          ];
        },
      };
    },
  };


  const result =
    await resolveDuplicateCase({
      duplicateCaseId:
        CASE_ID,

      decision:
        'same_person',

      notes:
        'Reviewed manually.',

      resolvedBy:
        'admin-test',

      includeAuditResult:
        true,

      DuplicateCaseModel,

      ApplicantModel,
    });


  assert.strictEqual(
    findOneOptions.new,
    false
  );

  assert.strictEqual(
    findOneOptions.runValidators,
    true
  );

  assert.strictEqual(
    findByIdCount,
    1
  );


  assert.strictEqual(
    result
      .duplicateCase
      .status,
    'resolved'
  );

  assert.strictEqual(
    result
      .duplicateCase
      .resolution
      .decision,
    'same_person'
  );


  assert.deepStrictEqual(
    result
      .auditChanges
      .map(
        change =>
          change.field
      ),
    [
      'duplicate.status',
      'duplicate.resolution.decision',
    ]
  );


  assert.strictEqual(
    result
      .auditMetadata
      .notesProvided,
    true
  );


  assert.strictEqual(
    JSON.stringify(
      result.auditChanges
    ).includes(
      'Reviewed manually.'
    ),
    false
  );


  console.log(
    '✅ Audit mode captures atomic duplicate pre-image'
  );

  console.log(
    '✅ resolved case reloaded for HTTP contract'
  );

  console.log(
    '✅ notes represented only as notesProvided boolean'
  );
}


/*
|--------------------------------------------------------------------------
| Default service contract remains direct duplicateCase
|--------------------------------------------------------------------------
*/

async function defaultContractTest() {
  const updated = {
    _id:
      CASE_ID,

    sourceApplicantId:
      APPLICANT_A,

    candidateApplicantId:
      APPLICANT_B,

    status:
      'resolved',

    resolution: {
      decision:
        'keep_separate',

      resolvedBy:
        'admin-test',

      resolvedAt:
        new Date(),

      notes:
        '',
    },
  };


  let optionsSeen =
    null;

  let unexpectedReload =
    false;


  const DuplicateCaseModel = {
    findOneAndUpdate(
      filter,
      mutation,
      options
    ) {
      optionsSeen =
        options;

      return {
        async lean() {
          return updated;
        },
      };
    },

    findById() {
      unexpectedReload =
        true;

      return {
        async lean() {
          return updated;
        },
      };
    },
  };


  const ApplicantModel = {
    find() {
      return {
        async lean() {
          return [
            {
              _id:
                APPLICANT_A,
            },
            {
              _id:
                APPLICANT_B,
            },
          ];
        },
      };
    },
  };


  const result =
    await resolveDuplicateCase({
      duplicateCaseId:
        CASE_ID,

      decision:
        'keep_separate',

      resolvedBy:
        'admin-test',

      DuplicateCaseModel,

      ApplicantModel,
    });


  assert.strictEqual(
    optionsSeen.new,
    true
  );

  assert.strictEqual(
    unexpectedReload,
    false
  );

  assert.strictEqual(
    result.status,
    'resolved'
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty
      .call(
        result,
        'duplicateCase'
      ),
    false
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty
      .call(
        result,
        'auditChanges'
      ),
    false
  );


  console.log(
    '✅ default duplicate service contract preserved'
  );
}


/*
|--------------------------------------------------------------------------
| Route wiring
|--------------------------------------------------------------------------
*/

function routeContractTest() {
  const source =
    fs.readFileSync(
      'src/routes/applicants.routes.js',
      'utf8'
    );


  const start =
    source.indexOf(
      "  router.patch(\n    '/duplicates/:caseId/resolve',"
    );

  const end =
    source.indexOf(
      '  router.',
      start + 20
    );


  assert(
    start >= 0 &&
    end > start
  );


  const block =
    source.slice(
      start,
      end
    );


  assert(
    block.includes(
      'includeAuditResult:'
    )
  );

  assert(
    block.includes(
      "'duplicate.resolved'"
    )
  );

  assert(
    block.includes(
      'sourceApplicantId'
    )
  );

  assert(
    block.includes(
      'candidateApplicantId'
    )
  );

  assert(
    block.includes(
      'new Set('
    )
  );

  assert(
    block.includes(
      "'duplicate_case'"
    )
  );

  assert(
    block.includes(
      'notesProvided:'
    )
  );

  assert.strictEqual(
    block.includes(
      'notes: req.body'
    ),
    false
  );

  assert(
    block.includes(
      'success: true'
    )
  );

  assert(
    block.includes(
      'duplicateCase,'
    )
  );


  console.log(
    '✅ route requests duplicate Audit result'
  );

  console.log(
    '✅ event targets both Applicant ids'
  );

  console.log(
    '✅ Duplicate Case provenance attached'
  );

  console.log(
    '✅ HTTP response remains { success, duplicateCase }'
  );
}


/*
|--------------------------------------------------------------------------
| ApplicantActivity contract
|--------------------------------------------------------------------------
*/

function activityContractTest() {
  const event =
    buildApplicantActivity({
      applicantId:
        APPLICANT_A,

      type:
        'duplicate.resolved',

      title:
        'Duplicate review resolved',

      source: {
        type:
          'duplicate_case',

        id:
          String(
            CASE_ID
          ),
      },

      changes: [
        {
          field:
            'duplicate.status',

          label:
            'Duplicate review status',

          before:
            'under_review',

          after:
            'resolved',
        },
        {
          field:
            'duplicate.resolution.decision',

          label:
            'Duplicate review decision',

          before:
            'pending',

          after:
            'same_person',
        },
      ],

      metadata: {
        notesProvided:
          true,

        counterpartApplicantId:
          String(
            APPLICANT_B
          ),
      },
    });


  assert.strictEqual(
    event.category,
    'duplicate'
  );

  assert.strictEqual(
    event.type,
    'duplicate.resolved'
  );

  assert.strictEqual(
    event.changes.length,
    2
  );

  assert.strictEqual(
    event.metadata.notesProvided,
    true
  );


  console.log(
    '✅ duplicate.resolved ApplicantActivity valid'
  );
}


(async () => {
  await auditModeTest();
  await defaultContractTest();

  routeContractTest();
  activityContractTest();

  console.log(
    '\nAPPLICANT AUDIT B3D TEST PASSED'
  );
})().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
