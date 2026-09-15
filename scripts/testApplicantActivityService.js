'use strict';

const assert =
  require('assert');

const {
  activityCategoryForType,
} = require(
  '../utils/applicantActivity'
);

const {
  normalizeActor,
  buildApplicantActivity,
  recordApplicantActivity,
} = require(
  '../services/applicantActivityService'
);


const applicantId =
  '64b000000000000000000001';


async function main() {
  assert.strictEqual(
    activityCategoryForType(
      'communication.email.sent'
    ),
    'communication'
  );

  assert.strictEqual(
    activityCategoryForType(
      'applicant.archived'
    ),
    'lifecycle'
  );

  console.log(
    '✅ activity categories resolve correctly'
  );


  assert.deepStrictEqual(
    normalizeActor({
      userId:
        ' admin-1 ',

      name:
        ' Admin User ',

      email:
        'ADMIN@EXAMPLE.COM ',

      role:
        ' Recruiter ',
    }),

    {
      userId:
        'admin-1',

      name:
        'Admin User',

      email:
        'admin@example.com',

      role:
        'Recruiter',
    }
  );

  console.log(
    '✅ activity actor normalized'
  );


  const event =
    buildApplicantActivity({
      applicantId,

      type:
        'status.changed',

      title:
        'Recruitment status changed',

      description:
        'Applied → Interview',

      occurredAt:
        '2026-09-15T10:00:00Z',

      actor: {
        userId:
          'admin-1',

        name:
          'Admin User',
      },

      source: {
        type:
          'applicant',

        id:
          applicantId,
      },

      metadata: {
        previousStatus:
          'applied',

        nextStatus:
          'interview',
      },
    });


  assert.strictEqual(
    event.type,
    'status.changed'
  );

  assert.strictEqual(
    event.category,
    'status'
  );

  assert.strictEqual(
    event.title,
    'Recruitment status changed'
  );

  assert.strictEqual(
    event.metadata
      .previousStatus,
    'applied'
  );

  console.log(
    '✅ activity event built safely'
  );


  let created =
    null;

  const FakeActivityModel = {
    async create(payload) {
      created =
        payload;

      return {
        _id:
          'activity-1',

        ...payload,
      };
    },
  };


  const saved =
    await recordApplicantActivity({
      applicantId,

      type:
        'communication.email.sent',

      title:
        'Email sent',

      actor: {
        userId:
          'admin-1',
      },

      source: {
        type:
          'email',
        id:
          'message-1',
      },

      metadata: {
        subject:
          'Application update',
      },

      ActivityModel:
        FakeActivityModel,
    });


  assert(
    created
  );

  assert.strictEqual(
    saved.type,
    'communication.email.sent'
  );

  assert.strictEqual(
    saved.category,
    'communication'
  );

  console.log(
    '✅ append service uses injected model'
  );


  assert.throws(
    () =>
      buildApplicantActivity({
        applicantId,

        type:
          'invalid.event',

        title:
          'Invalid',
      }),

    (
      error
    ) =>
      error.code ===
      'APPLICANT_ACTIVITY_TYPE_INVALID'
  );

  console.log(
    '✅ invalid activity type rejected'
  );


  console.log(
    'APPLICANT ACTIVITY SERVICE TEST PASSED'
  );
}


main().catch(
  (error) => {
    console.error(
      error
    );

    process.exit(1);
  }
);
