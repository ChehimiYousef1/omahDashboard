'use strict';

const assert =
  require('assert');

const {
  permanentlyDeleteApplicantInternalNote,
} = require(
  '../services/applicantInternalNotesService'
);

const {
  permanentlyDeleteApplicant,
} = require(
  '../services/applicantPermanentDeleteService'
);


const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const NOTE_ID =
  '507f1f77bcf86cd799439012';


function queryResult(
  value
) {
  return {
    async lean() {
      return value;
    },
  };
}


async function run() {
  /*
   * NOTE/TASK PERMANENT DELETE
   */
  let replyDeletes =
    0;

  let noteDeletes =
    0;

  const ApplicantModel = {
    findById() {
      return queryResult({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived: false,
        },
      });
    },
  };

  const NoteModel = {
    findOne() {
      return queryResult({
        _id:
          NOTE_ID,

        applicantId:
          APPLICANT_ID,

        kind:
          'task',

        archived:
          true,

        calendar: {
          provider:
            'google_calendar',

          eventId:
            'linked-event-1',

          syncStatus:
            'synced',
        },
      });
    },

    async deleteOne() {
      noteDeletes +=
        1;

      return {
        deletedCount:
          1,
      };
    },
  };

  const ReplyModel = {
    async deleteMany() {
      replyDeletes +=
        1;

      return {
        deletedCount:
          2,
      };
    },
  };

  await assert.rejects(
    () =>
      permanentlyDeleteApplicantInternalNote({
        applicantId:
          APPLICANT_ID,

        noteId:
          NOTE_ID,

        confirmation:
          'DELETE',

        ApplicantModel,
        NoteModel,
        ReplyModel,
      }),

    error =>
      error?.code ===
      'INTERNAL_NOTE_DELETE_CALENDAR_LINKED'
  );

  assert.strictEqual(
    replyDeletes,
    0
  );

  assert.strictEqual(
    noteDeletes,
    0
  );

  console.log(
    '✅ linked Calendar event blocks note/task permanent deletion before cleanup'
  );


  /*
   * APPLICANT PERMANENT DELETE
   */
  let storageCleanup =
    0;

  let applicantDelete =
    0;

  const ArchivedApplicantModel = {
    findById() {
      return queryResult({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived: true,
        },
      });
    },

    async deleteOne() {
      applicantDelete +=
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
        []
      );
    },
  };

  const CalendarNoteModel = {
    find() {
      return queryResult([
        {
          _id:
            NOTE_ID,

          applicantId:
            APPLICANT_ID,

          calendar: {
            provider:
              'google_calendar',

            eventId:
              'linked-event-2',
          },
        },
      ]);
    },
  };

  const DocumentModel = {
    find() {
      throw new Error(
        'Document lookup must not occur after Calendar guard fails.'
      );
    },
  };

  const unusedDeleteModel = {
    async deleteMany() {
      throw new Error(
        'Destructive cleanup must not run.'
      );
    },
  };

  const storageFactory = {
    getProvider() {
      return {
        async cleanup() {
          storageCleanup +=
            1;

          return true;
        },
      };
    },
  };

  await assert.rejects(
    () =>
      permanentlyDeleteApplicant({
        applicantId:
          APPLICANT_ID,

        confirmation:
          'DELETE',

        ApplicantModel:
          ArchivedApplicantModel,

        DocumentModel,

        EvaluationModel:
          unusedDeleteModel,

        InterviewModel,

        DuplicateCaseModel:
          unusedDeleteModel,

        ActivityModel:
          unusedDeleteModel,

        NoteModel:
          CalendarNoteModel,

        ReplyModel:
          unusedDeleteModel,

        storageFactory,
      }),

    error =>
      error?.code ===
      'APPLICANT_PERMANENT_DELETE_INTERNAL_CALENDAR_ACTIVE'
  );

  assert.strictEqual(
    storageCleanup,
    0
  );

  assert.strictEqual(
    applicantDelete,
    0
  );

  console.log(
    '✅ linked internal Calendar event blocks Applicant deletion before destructive cleanup'
  );

  console.log(
    '✅ no Calendar delete call performed implicitly'
  );

  console.log(
    '\nAPPLICANT INTERNAL CALENDAR DELETION GUARD TEST PASSED'
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
