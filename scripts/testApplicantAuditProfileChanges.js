'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');

const {
  editApplicantProfile,
} = require(
  '../services/applicantEditService'
);

const {
  buildApplicantActivity,
} = require(
  '../services/applicantActivityService'
);


async function run() {
  const applicantId =
    new mongoose.Types.ObjectId();


  let capturedFilter;
  let capturedUpdate;
  let capturedOptions;


  const MockApplicantModel = {
    async findOneAndUpdate(
      filter,
      update,
      options
    ) {
      capturedFilter =
        filter;

      capturedUpdate =
        update;

      capturedOptions =
        options;

      /*
       * Document state immediately BEFORE update.
       */
      return {
        identity: {
          city:
            'Tripoli',

          fullName:
            'Old Applicant',
        },

        skills: {
          frameworks: [
            'React',
          ],
        },
      };
    },
  };


  const result =
    await editApplicantProfile({
      applicantId,

      changes: {
        'identity.city':
          'Beirut',

        'identity.fullName':
          'Updated Applicant',

        'skills.frameworks': [
          'React',
          'Node.js',
        ],
      },

      ApplicantModel:
        MockApplicantModel,
    });


  /*
  |--------------------------------------------------------------------------
  | Mutation contract
  |--------------------------------------------------------------------------
  */

  assert.strictEqual(
    capturedFilter[
      'lifecycle.archived'
    ].$ne,
    true
  );


  assert.strictEqual(
    capturedUpdate.$set[
      'identity.city'
    ],
    'Beirut'
  );


  assert.strictEqual(
    capturedUpdate.$inc
      .profileVersion,
    1
  );


  assert.strictEqual(
    capturedOptions.new,
    false
  );


  assert.strictEqual(
    capturedOptions.runValidators,
    true
  );


  /*
  |--------------------------------------------------------------------------
  | Exact field-level audit history
  |--------------------------------------------------------------------------
  */

  assert.deepStrictEqual(
    result.auditChanges,
    [
      {
        field:
          'identity.city',

        label:
          'identity.city',

        before:
          'Tripoli',

        after:
          'Beirut',
      },

      {
        field:
          'identity.fullName',

        label:
          'identity.fullName',

        before:
          'Old Applicant',

        after:
          'Updated Applicant',
      },

      {
        field:
          'skills.frameworks',

        label:
          'skills.frameworks',

        before: [
          'React',
        ],

        after: [
          'React',
          'Node.js',
        ],
      },
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | Existing audit sanitization pipeline
  |--------------------------------------------------------------------------
  */

  const event =
    buildApplicantActivity({
      applicantId,

      type:
        'profile.updated',

      title:
        'Applicant profile updated',

      changes:
        result.auditChanges,
    });


  assert.deepStrictEqual(
    event.changes,
    result.auditChanges
  );


  /*
  |--------------------------------------------------------------------------
  | Route uses service result, not request reconstruction
  |--------------------------------------------------------------------------
  */

  const routes =
    fs.readFileSync(
      'src/routes/applicants.routes.js',
      'utf8'
    );


  const routeStart =
    routes.indexOf(
      "'/:id/profile'"
    );

  const routeEnd =
    routes.indexOf(
      "'/:id/status'",
      routeStart + 1
    );


  assert(
    routeStart >= 0 &&
    routeEnd > routeStart
  );


  const profileRoute =
    routes.slice(
      routeStart,
      routeEnd
    );


  assert(
    profileRoute.includes(
      'result.auditChanges'
    ),
    'Profile route must use service auditChanges'
  );


  /*
  |--------------------------------------------------------------------------
  | Swagger grouping unchanged
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
    '✅ atomic profile pre-image captured'
  );

  console.log(
    '✅ identity.city before → after'
  );

  console.log(
    '✅ identity.fullName before → after'
  );

  console.log(
    '✅ array profile field before → after'
  );

  console.log(
    '✅ profileVersion increment preserved'
  );

  console.log(
    '✅ archived Applicant protection preserved'
  );

  console.log(
    '✅ route consumes service auditChanges'
  );

  console.log(
    '✅ Applicant Audit & History preserved'
  );

  console.log(
    '\nAPPLICANT AUDIT B2B TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
