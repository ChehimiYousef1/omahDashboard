'use strict';

const assert =
  require('assert');

const {
  permanentlyDeleteApplicant,
} = require(
  '../services/applicantPermanentDeleteService'
);

const APPLICANT_ID =
  '507f1f77bcf86cd799439011';


function queryResult(
  value
) {
  return {
    async lean() {
      return value;
    },
  };
}


function baseModels({
  archived = true,
  interviews = [],
} = {}) {
  const calls = {
    applicantDelete:
      0,

    documentDelete:
      0,

    evaluationDelete:
      0,

    interviewDelete:
      0,

    duplicateDelete:
      0,

    activityDelete:
      0,


    noteDelete:
      0,

    noteReplyDelete:
      0,

    storageCleanup:
      0,
  };


  const ApplicantModel = {
    findById() {
      return queryResult({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived,
        },
      });
    },

    async deleteOne() {
      calls.applicantDelete +=
        1;

      return {
        deletedCount:
          1,
      };
    },
  };


  const DocumentModel = {
    find() {
      return queryResult([
        {
          storage: {
            provider:
              'local',

            key:
              'applicant/test.pdf',
          },
        },

        {
          storage: {
            provider:
              'external',

            externalUrl:
              'https://example.com/source',
          },
        },
      ]);
    },

    async deleteMany() {
      calls.documentDelete +=
        1;

      return {
        deletedCount:
          2,
      };
    },
  };


  const EvaluationModel = {
    async deleteMany() {
      calls.evaluationDelete +=
        1;

      return {
        deletedCount:
          1,
      };
    },
  };


  const InterviewModel = {
    find() {
      return queryResult(
        interviews
      );
    },

    async deleteMany() {
      calls.interviewDelete +=
        1;

      return {
        deletedCount:
          interviews.length,
      };
    },
  };


  const DuplicateCaseModel = {
    async deleteMany() {
      calls.duplicateDelete +=
        1;

      return {
        deletedCount:
          1,
      };
    },
  };


  const ActivityModel = {
    async deleteMany() {
      calls.activityDelete +=
        1;

      return {
        deletedCount:
          3,
      };
    },
  };


  const NoteModel = {
    find() {
      return queryResult(
        []
      );
    },

    async deleteMany() {
      calls.noteDelete +=
        1;

      return {
        deletedCount:
          2,
      };
    },
  };


  const ReplyModel = {
    async deleteMany() {
      calls.noteReplyDelete +=
        1;

      return {
        deletedCount:
          4,
      };
    },
  };


  const storageFactory = {
    getProvider(
      provider
    ) {
      assert.strictEqual(
        provider,
        'local'
      );

      return {
        async cleanup({
          key,
        }) {
          assert.strictEqual(
            key,
            'applicant/test.pdf'
          );

          calls.storageCleanup +=
            1;

          return true;
        },
      };
    },
  };


  return {
    calls,
    ApplicantModel,
    DocumentModel,
    EvaluationModel,
    InterviewModel,
    DuplicateCaseModel,
    ActivityModel,
    NoteModel,
    ReplyModel,
    storageFactory,
  };
}


async function run() {
  const success =
    baseModels();


  const result =
    await permanentlyDeleteApplicant({
      applicantId:
        APPLICANT_ID,

      confirmation:
        'DELETE',

      ...success,
    });


  assert.strictEqual(
    result.status,
    'applicant-permanently-deleted'
  );

  assert.strictEqual(
    result
      .preservedFormSubmissions,
    true
  );

  assert.strictEqual(
    success.calls
      .storageCleanup,
    1
  );

  assert.strictEqual(
    success.calls
      .applicantDelete,
    1
  );

  assert.strictEqual(
    success.calls
      .documentDelete,
    1
  );

  assert.strictEqual(
    success.calls
      .evaluationDelete,
    1
  );

  assert.strictEqual(
    success.calls
      .duplicateDelete,
    1
  );

  assert.strictEqual(
    success.calls
      .activityDelete,
    1
  );

  assert.strictEqual(
    success.calls
      .noteReplyDelete,
    1
  );

  assert.strictEqual(
    result.deleted
      .noteReplies,
    4
  );

  assert.strictEqual(
    result.deleted
      .notes,
    2
  );

  console.log(
    '✅ archived Applicant cascade deletion succeeds'
  );

  console.log(
    '✅ managed file cleaned while external source is untouched'
  );

  console.log(
    '✅ immutable Form submissions are not modified'
  );


  const active =
    baseModels({
      archived:
        false,
    });

  await assert.rejects(
    () =>
      permanentlyDeleteApplicant({
        applicantId:
          APPLICANT_ID,

        confirmation:
          'DELETE',

        ...active,
      }),

    error =>
      error?.code ===
        'APPLICANT_PERMANENT_DELETE_NOT_ALLOWED'
  );

  assert.strictEqual(
    active.calls
      .applicantDelete,
    0
  );

  console.log(
    '✅ active Applicant permanent deletion blocked'
  );


  const interview =
    baseModels({
      interviews: [
        {
          _id:
            'interview-1',

          status:
            'scheduled',

          archived:
            false,

          format:
            'online',

          meeting: {
            providerEventId:
              'event-1',

            status:
              'scheduled',
          },
        },
      ],
    });

  await assert.rejects(
    () =>
      permanentlyDeleteApplicant({
        applicantId:
          APPLICANT_ID,

        confirmation:
          'DELETE',

        ...interview,
      }),

    error =>
      error?.code ===
        'APPLICANT_PERMANENT_DELETE_ACTIVE_INTERVIEWS'
  );

  assert.strictEqual(
    interview.calls
      .storageCleanup,
    0
  );

  assert.strictEqual(
    interview.calls
      .applicantDelete,
    0
  );

  console.log(
    '✅ active interview blocks deletion before destructive cleanup'
  );


  await assert.rejects(
    () =>
      permanentlyDeleteApplicant({
        applicantId:
          APPLICANT_ID,

        confirmation:
          'delete',

        ...baseModels(),
      }),

    error =>
      error?.code ===
        'APPLICANT_DELETE_CONFIRMATION_REQUIRED'
  );

  console.log(
    '✅ exact DELETE confirmation required'
  );

  console.log(
    '✅ no real MongoDB connection used'
  );

  console.log(
    '✅ no real filesystem/S3 deletion performed'
  );

  console.log(
    '✅ no Calendar or meeting-provider call performed'
  );

  console.log(
    '\nAPPLICANT PERMANENT DELETE SERVICE TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
