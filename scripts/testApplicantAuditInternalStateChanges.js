'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const {
  setApplicantInternalNoteImportance,
  updateApplicantInternalNoteSchedule,
} = require(
  '../services/applicantInternalNotesService'
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


const ApplicantModel = {
  findById() {
    return queryResult({
      _id:
        APPLICANT_ID,

      lifecycle: {
        archived:
          false,
      },
    });
  },
};


const actor = {
  userId:
    'admin-1',

  name:
    'Audit Admin',

  email:
    'admin@example.com',

  role:
    'ADMIN',
};


async function run() {

  /*
  |--------------------------------------------------------------------------
  | Importance
  |--------------------------------------------------------------------------
  */

  const importanceModel = {
    findOne() {
      return queryResult({
        _id:
          NOTE_ID,

        applicantId:
          APPLICANT_ID,

        important:
          false,
      });
    },

    findOneAndUpdate(
      filter,
      update
    ) {
      return queryResult({
        _id:
          NOTE_ID,

        applicantId:
          APPLICANT_ID,

        kind:
          'note',

        important:
          update.$set
            .important,
      });
    },
  };


  const importance =
    await setApplicantInternalNoteImportance({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      important:
        true,

      actor,

      ApplicantModel,

      NoteModel:
        importanceModel,
    });


  assert.deepStrictEqual(
    importance.auditChanges,
    [
      {
        field:
          'internal.important',

        label:
          'Importance',

        before:
          false,

        after:
          true,
      },
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | Schedule
  |--------------------------------------------------------------------------
  */

  const scheduleModel = {
    findOne() {
      return queryResult({
        _id:
          NOTE_ID,

        applicantId:
          APPLICANT_ID,

        kind:
          'task',

        schedule: {
          startAt:
            new Date(
              '2026-09-19T12:00:00.000Z'
            ),

          endAt:
            new Date(
              '2026-09-19T13:00:00.000Z'
            ),

          reminderAt:
            new Date(
              '2026-09-19T11:30:00.000Z'
            ),

          reminderNote:
            'Old reminder',
        },
      });
    },

    findOneAndUpdate(
      filter,
      update
    ) {
      return queryResult({
        _id:
          NOTE_ID,

        applicantId:
          APPLICANT_ID,

        kind:
          'task',

        schedule:
          update.$set
            .schedule,
      });
    },
  };


  const schedule =
    await updateApplicantInternalNoteSchedule({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      schedule: {
        startAt:
          '2026-09-19T12:00:00.000Z',

        endAt:
          '2026-09-19T13:00:00.000Z',

        reminderAt:
          '2026-09-19T11:45:00.000Z',

        reminderNote:
          'Ask for portfolio update',
      },

      actor,

      ApplicantModel,

      NoteModel:
        scheduleModel,
    });


  assert.deepStrictEqual(
    schedule.auditChanges,
    [
      {
        field:
          'schedule.reminderAt',

        label:
          'Reminder time',

        before:
          '2026-09-19T11:30:00.000Z',

        after:
          '2026-09-19T11:45:00.000Z',
      },

      {
        field:
          'schedule.reminderNote',

        label:
          'Reminder note',

        before:
          'Old reminder',

        after:
          'Ask for portfolio update',
      },
    ]
  );


  /*
  |--------------------------------------------------------------------------
  | Route wiring
  |--------------------------------------------------------------------------
  */

  const routes =
    fs.readFileSync(
      'src/routes/applicants.routes.js',
      'utf8'
    );


  function section(
    startMarker,
    endMarker
  ) {
    const start =
      routes.indexOf(
        startMarker
      );

    const end =
      routes.indexOf(
        endMarker,
        start + 1
      );

    assert(
      start >= 0 &&
      end > start
    );

    return routes.slice(
      start,
      end
    );
  }


  assert(
    section(
      "'/:id/notes/:noteId/importance'",
      "'/:id/notes/:noteId/like'"
    ).includes(
      'result.auditChanges'
    )
  );


  assert(
    section(
      "'/:id/notes/:noteId/schedule'",
      "'/:id/notes/:noteId/calendar'"
    ).includes(
      'result.auditChanges'
    )
  );


  console.log(
    '✅ importance before → after'
  );

  console.log(
    '✅ schedule field comparison'
  );

  console.log(
    '✅ unchanged schedule fields excluded'
  );

  console.log(
    '✅ reminderAt before → after'
  );

  console.log(
    '✅ reminderNote before → after'
  );

  console.log(
    '✅ route auditChanges connected'
  );

  console.log(
    '\nAPPLICANT AUDIT B2C TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
