'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');

const {
  buildProfileApprovalAuditChanges,
  approveProfileFieldsFromSubmission,
} = require(
  '../services/applicantProfileService'
);

const {
  buildApplicantActivity,
} = require(
  '../services/applicantActivityService'
);


const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const OLD_SUBMISSION_ID =
  '507f1f77bcf86cd799439012';

const NEW_SUBMISSION_ID =
  '507f1f77bcf86cd799439013';


/*
|--------------------------------------------------------------------------
| Pure before → after comparison
|--------------------------------------------------------------------------
*/

const previous = {
  identity: {
    email:
      'old@example.com',

    city:
      'Beirut',
  },

  education: {
    major:
      'Software Engineering',
  },

  skills: {
    frameworks: [
      'React',
    ],
  },

  latestApprovedSubmissionId:
    new mongoose.Types.ObjectId(
      OLD_SUBMISSION_ID
    ),
};


const approvedUpdate = {
  'identity.email':
    'new@example.com',

  'identity.normalizedEmail':
    'new@example.com',

  'identity.city':
    'Beirut',

  'education.major':
    'Computer Science',

  'skills.frameworks': [
    'React',
    'Express',
  ],

  latestApprovedSubmissionId:
    new mongoose.Types.ObjectId(
      NEW_SUBMISSION_ID
    ),
};


const changes =
  buildProfileApprovalAuditChanges({
    previous,

    approvedUpdate,

    approvedFields: [
      'identity.email',
      'identity.city',
      'education.major',
      'skills.frameworks',
    ],

    submissionId:
      new mongoose.Types.ObjectId(
        NEW_SUBMISSION_ID
      ),
  });


const fields =
  changes.map(
    item =>
      item.field
  );


assert.deepStrictEqual(
  fields,
  [
    'identity.email',
    'education.major',
    'skills.frameworks',
    'latestApprovedSubmissionId',
  ]
);


assert.strictEqual(
  fields.includes(
    'identity.city'
  ),
  false
);


assert.strictEqual(
  fields.includes(
    'identity.normalizedEmail'
  ),
  false
);


console.log(
  '✅ approved fields before → after detected'
);

console.log(
  '✅ unchanged approved fields excluded'
);

console.log(
  '✅ normalized companions excluded'
);

console.log(
  '✅ approved submission provenance captured'
);


/*
|--------------------------------------------------------------------------
| Runtime optional Audit result
|--------------------------------------------------------------------------
*/

async function runtimeAuditTest() {
  const applicantObjectId =
    new mongoose.Types.ObjectId(
      APPLICANT_ID
    );

  const submissionObjectId =
    new mongoose.Types.ObjectId(
      NEW_SUBMISSION_ID
    );


  const submission = {
    _id:
      submissionObjectId,

    applicantId:
      applicantObjectId,

    personal: {
      email:
        'new@example.com',

      city:
        'Sidon',
    },

    education: {
      major:
        'Computer Science',
    },

    skills: {
      frameworks: [
        'Express',
      ],
    },

    profiles: {},
  };


  const previousApplicant = {
    _id:
      applicantObjectId,

    identity: {
      email:
        'old@example.com',

      city:
        'Beirut',
    },

    education: {
      major:
        'Software Engineering',
    },

    skills: {
      frameworks: [
        'React',
      ],
    },

    profileVersion:
      4,

    latestApprovedSubmissionId:
      new mongoose.Types.ObjectId(
        OLD_SUBMISSION_ID
      ),

    lifecycle: {
      archived:
        false,
    },
  };


  let captured =
    null;


  const ApplicantModel = {
    async findOneAndUpdate(
      filter,
      mutation,
      options
    ) {
      captured = {
        filter,
        mutation,
        options,
      };

      return previousApplicant;
    },
  };


  const SubmissionModel = {
    async findById() {
      return submission;
    },
  };


  const approval =
    await approveProfileFieldsFromSubmission({
      applicantId:
        APPLICANT_ID,

      submissionId:
        NEW_SUBMISSION_ID,

      fields: [
        'identity.email',
        'identity.city',
        'education.major',
        'skills.frameworks',
      ],

      includeAuditResult:
        true,

      ApplicantModel,

      SubmissionModel,
    });


  assert(
    captured
  );

  assert.strictEqual(
    captured.options.new,
    false
  );

  assert.strictEqual(
    captured.options.runValidators,
    true
  );

  assert.strictEqual(
    captured.mutation
      .$inc
      .profileVersion,
    1
  );

  assert.strictEqual(
    String(
      captured.mutation
        .$set
        .latestApprovedSubmissionId
    ),
    NEW_SUBMISSION_ID
  );


  assert.strictEqual(
    approval.result.status,
    'profile-updated'
  );

  assert.strictEqual(
    approval.result.applicantId,
    APPLICANT_ID
  );

  assert.strictEqual(
    approval.result.submissionId,
    NEW_SUBMISSION_ID
  );


  const runtimeFields =
    approval.auditChanges.map(
      change =>
        change.field
    );


  for (
    const field
    of [
      'identity.email',
      'identity.city',
      'education.major',
      'skills.frameworks',
      'latestApprovedSubmissionId',
    ]
  ) {
    assert(
      runtimeFields.includes(
        field
      ),
      'Missing Audit field: ' +
        field
    );
  }


  for (
    const forbidden
    of [
      'identity.normalizedEmail',
      'identity.normalizedPhone',
      'profiles.linkedinCanonical',
      'profileVersion',
    ]
  ) {
    assert.strictEqual(
      runtimeFields.includes(
        forbidden
      ),
      false,
      'System-controlled field leaked into approval Audit: ' +
        forbidden
    );
  }


  console.log(
    '✅ Audit mode captures atomic Applicant pre-image'
  );

  console.log(
    '✅ profileVersion increment preserved'
  );

  console.log(
    '✅ system-controlled companions excluded from Audit'
  );
}


/*
|--------------------------------------------------------------------------
| Default service contract still uses updateOne
|--------------------------------------------------------------------------
*/

async function defaultContractTest() {
  const applicantObjectId =
    new mongoose.Types.ObjectId(
      APPLICANT_ID
    );

  const submissionObjectId =
    new mongoose.Types.ObjectId(
      NEW_SUBMISSION_ID
    );


  let updateOneCalled =
    false;


  const ApplicantModel = {
    async updateOne(
      filter,
      mutation
    ) {
      updateOneCalled =
        true;

      assert.strictEqual(
        mutation
          .$inc
          .profileVersion,
        1
      );

      return {
        matchedCount:
          1,

        modifiedCount:
          1,
      };
    },
  };


  const SubmissionModel = {
    async findById() {
      return {
        _id:
          submissionObjectId,

        applicantId:
          applicantObjectId,

        personal: {
          email:
            'new@example.com',
        },
      };
    },
  };


  const result =
    await approveProfileFieldsFromSubmission({
      applicantId:
        APPLICANT_ID,

      submissionId:
        NEW_SUBMISSION_ID,

      fields: [
        'identity.email',
      ],

      ApplicantModel,

      SubmissionModel,
    });


  assert.strictEqual(
    updateOneCalled,
    true
  );

  assert.strictEqual(
    result.status,
    'profile-updated'
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty
      .call(
        result,
        'result'
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
    '✅ default updateOne service contract preserved'
  );
}


/*
|--------------------------------------------------------------------------
| Route contract
|--------------------------------------------------------------------------
*/

function routeContractTest() {
  const source =
    fs.readFileSync(
      'src/routes/applicants.routes.js',
      'utf8'
    );


  const startMarker =
    "  router.patch(\n    '/:id/approve-profile',";

  const endMarker =
    "  router.post(\n    '/:id/submissions/:submissionId/link',";


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
    start >= 0 &&
    end > start,
    'approve-profile route block missing'
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
      "'profile.approved'"
    )
  );

  assert(
    block.includes(
      'auditChanges'
    )
  );

  assert(
    block.includes(
      "type:\n                'submission'"
    )
  );

  assert.strictEqual(
    block.includes(
      "'profile.updated'"
    ),
    false,
    'approve-profile route must not duplicate profile.updated'
  );

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


  console.log(
    '✅ profile.approved route event wired'
  );

  console.log(
    '✅ no duplicate profile.updated event'
  );

  console.log(
    '✅ HTTP response remains { success, result }'
  );
}


/*
|--------------------------------------------------------------------------
| Activity registry contract
|--------------------------------------------------------------------------
*/

function activityContractTest() {
  const event =
    buildApplicantActivity({
      applicantId:
        APPLICANT_ID,

      type:
        'profile.approved',

      title:
        'Applicant profile fields approved',

      source: {
        type:
          'submission',

        id:
          NEW_SUBMISSION_ID,
      },

      changes: [
        {
          field:
            'education.major',

          label:
            'education.major',

          before:
            'Software Engineering',

          after:
            'Computer Science',
        },
      ],
    });


  assert.strictEqual(
    event.category,
    'profile'
  );

  assert.strictEqual(
    event.type,
    'profile.approved'
  );

  assert.strictEqual(
    event.changes.length,
    1
  );


  console.log(
    '✅ profile.approved activity contract valid'
  );
}


(async () => {
  await runtimeAuditTest();
  await defaultContractTest();

  routeContractTest();
  activityContractTest();

  console.log(
    '\nAPPLICANT AUDIT B3C2 TEST PASSED'
  );
})().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
