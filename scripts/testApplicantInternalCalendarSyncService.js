'use strict';

const assert =
  require('assert');

const {
  addApplicantInternalItemToCalendar,
  updateApplicantInternalItemCalendar,
  removeApplicantInternalItemFromCalendar,
} = require(
  '../services/applicantInternalCalendarSyncService'
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


function setPath(
  target,
  path,
  value
) {
  const parts =
    path.split('.');

  let cursor =
    target;

  for (
    let index = 0;
    index <
      parts.length - 1;
    index += 1
  ) {
    const part =
      parts[index];

    if (
      !cursor[part] ||
      typeof cursor[part] !==
        'object'
    ) {
      cursor[part] = {};
    }

    cursor =
      cursor[part];
  }

  cursor[
    parts.at(-1)
  ] =
    value;
}


function models() {
  const applicant = {
    _id:
      APPLICANT_ID,

    identity: {
      fullName:
        'Calendar Test Applicant',
    },

    lifecycle: {
      archived: false,
    },
  };

  const note = {
    _id:
      NOTE_ID,

    applicantId:
      APPLICANT_ID,

    kind:
      'task',

    content:
      'Review candidate portfolio',

    archived:
      false,

    schedule: {
      startAt:
        new Date(
          '2026-09-18T09:00:00.000Z'
        ),

      endAt:
        new Date(
          '2026-09-18T10:00:00.000Z'
        ),

      reminderAt:
        new Date(
          '2026-09-18T08:30:00.000Z'
        ),

      reminderNote:
        'Review CV first',
    },

    calendar: {
      provider:
        '',

      eventId:
        '',

      eventUrl:
        '',

      syncStatus:
        'not_synced',

      syncedAt:
        null,

      syncError:
        '',
    },
  };

  const ApplicantModel = {
    findById() {
      return queryResult(
        applicant
      );
    },
  };

  const NoteModel = {
    findOne() {
      return queryResult(
        note
      );
    },

    findOneAndUpdate(
      filter,
      update
    ) {
      assert.strictEqual(
        String(filter._id),
        NOTE_ID
      );

      for (
        const [
          key,
          value,
        ]
        of Object.entries(
          update.$set ||
          {}
        )
      ) {
        setPath(
          note,
          key,
          value
        );
      }

      return queryResult(
        note
      );
    },
  };

  return {
    applicant,
    note,
    ApplicantModel,
    NoteModel,
  };
}


async function run() {
  const actor = {
    userId:
      'admin-1',

    name:
      'Admin User',

    email:
      'admin@example.com',

    role:
      'ADMIN',
  };


  /*
   * ADD
   */
  const addModels =
    models();

  let createCalls =
    0;

  let rollbackCalls =
    0;

  const added =
    await addApplicantInternalItemToCalendar({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      actor,

      timezone:
        'Asia/Beirut',

      ApplicantModel:
        addModels
          .ApplicantModel,

      NoteModel:
        addModels
          .NoteModel,

      async createCalendarEvent(
        payload
      ) {
        createCalls +=
          1;

        assert.strictEqual(
          payload.kind,
          'task'
        );

        assert.strictEqual(
          payload.applicantName,
          'Calendar Test Applicant'
        );

        return {
          eventId:
            'calendar-event-1',

          eventUrl:
            'https://calendar.google.test/calendar-event-1',

          syncStatus:
            'synced',

          syncedAt:
            new Date(
              '2026-09-17T10:00:00.000Z'
            ),
        };
      },

      async deleteCalendarEvent() {
        rollbackCalls +=
          1;
      },
    });

  assert.strictEqual(
    createCalls,
    1
  );

  assert.strictEqual(
    rollbackCalls,
    0
  );

  assert.strictEqual(
    added.note
      .calendar
      .eventId,
    'calendar-event-1'
  );

  assert.strictEqual(
    added.note
      .calendar
      .syncStatus,
    'synced'
  );

  console.log(
    '✅ Calendar add lifecycle'
  );


  /*
   * UPDATE
   */
  let updateCalls =
    0;

  const updated =
    await updateApplicantInternalItemCalendar({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      actor,

      timezone:
        'Asia/Beirut',

      ApplicantModel:
        addModels
          .ApplicantModel,

      NoteModel:
        addModels
          .NoteModel,

      async updateCalendarEvent(
        payload
      ) {
        updateCalls +=
          1;

        assert.strictEqual(
          payload.providerEventId,
          'calendar-event-1'
        );

        return {
          eventId:
            'calendar-event-1',

          eventUrl:
            'https://calendar.google.test/calendar-event-1-updated',

          syncedAt:
            new Date(
              '2026-09-17T11:00:00.000Z'
            ),
        };
      },
    });

  assert.strictEqual(
    updateCalls,
    1
  );

  assert.strictEqual(
    updated.note
      .calendar
      .syncStatus,
    'synced'
  );

  console.log(
    '✅ Calendar update lifecycle'
  );


  /*
   * REMOVE
   */
  let deleteCalls =
    0;

  const removed =
    await removeApplicantInternalItemFromCalendar({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      actor,

      ApplicantModel:
        addModels
          .ApplicantModel,

      NoteModel:
        addModels
          .NoteModel,

      async deleteCalendarEvent({
        providerEventId,
      }) {
        deleteCalls +=
          1;

        assert.strictEqual(
          providerEventId,
          'calendar-event-1'
        );
      },
    });

  assert.strictEqual(
    deleteCalls,
    1
  );

  assert.strictEqual(
    removed.note
      .calendar
      .eventId,
    ''
  );

  assert.strictEqual(
    removed.note
      .calendar
      .syncStatus,
    'not_synced'
  );

  console.log(
    '✅ Calendar remove lifecycle'
  );


  /*
   * ARCHIVED APPLICANT + ITEM MAY STILL
   * REMOVE THEIR EXTERNAL CALENDAR EVENT.
   */
  const archivedModels =
    models();

  archivedModels
    .applicant
    .lifecycle
    .archived =
    true;

  archivedModels
    .note
    .archived =
    true;

  archivedModels
    .note
    .calendar = {
      provider:
        'google_calendar',

      eventId:
        'calendar-event-archived',

      eventUrl:
        'https://calendar.google.test/calendar-event-archived',

      syncStatus:
        'synced',

      syncedAt:
        new Date(),

      syncError:
        '',
    };

  let archivedDeleteCalls =
    0;

  const archivedRemoved =
    await removeApplicantInternalItemFromCalendar({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      actor,

      ApplicantModel:
        archivedModels
          .ApplicantModel,

      NoteModel:
        archivedModels
          .NoteModel,

      async deleteCalendarEvent({
        providerEventId,
      }) {
        archivedDeleteCalls +=
          1;

        assert.strictEqual(
          providerEventId,
          'calendar-event-archived'
        );
      },
    });

  assert.strictEqual(
    archivedDeleteCalls,
    1
  );

  assert.strictEqual(
    archivedRemoved.note
      .calendar
      .eventId,
    ''
  );

  assert.strictEqual(
    archivedRemoved.note
      .calendar
      .syncStatus,
    'not_synced'
  );

  console.log(
    '✅ archived Applicant/item Calendar removal allowed'
  );


  /*
   * PROVIDER FAILURE -> LOCAL ERROR STATE
   */
  const failedModels =
    models();

  await assert.rejects(
    () =>
      addApplicantInternalItemToCalendar({
        applicantId:
          APPLICANT_ID,

        noteId:
          NOTE_ID,

        actor,

        ApplicantModel:
          failedModels
            .ApplicantModel,

        NoteModel:
          failedModels
            .NoteModel,

        async createCalendarEvent() {
          const error =
            new Error(
              'Mock provider unavailable'
            );

          error.code =
            'MOCK_PROVIDER_FAILURE';

          throw error;
        },

        async deleteCalendarEvent() {
          throw new Error(
            'Should not run'
          );
        },
      }),

    error =>
      error?.code ===
      'MOCK_PROVIDER_FAILURE'
  );

  assert.strictEqual(
    failedModels.note
      .calendar
      .syncStatus,
    'error'
  );

  assert.strictEqual(
    failedModels.note
      .calendar
      .syncError,
    'Mock provider unavailable'
  );

  console.log(
    '✅ provider failure stored locally'
  );


  /*
   * VALID SCHEDULE REQUIRED
   */
  const invalidModels =
    models();

  invalidModels.note
    .schedule
    .endAt =
    null;

  let invalidProviderCalls =
    0;

  await assert.rejects(
    () =>
      addApplicantInternalItemToCalendar({
        applicantId:
          APPLICANT_ID,

        noteId:
          NOTE_ID,

        actor,

        ApplicantModel:
          invalidModels
            .ApplicantModel,

        NoteModel:
          invalidModels
            .NoteModel,

        async createCalendarEvent() {
          invalidProviderCalls +=
            1;

          return {};
        },
      }),

    error =>
      error?.code ===
      'INTERNAL_CALENDAR_SCHEDULE_REQUIRED'
  );

  assert.strictEqual(
    invalidProviderCalls,
    0
  );

  console.log(
    '✅ invalid schedule blocked before provider'
  );


  console.log(
    '✅ no real Google Calendar client used'
  );

  console.log(
    '\nAPPLICANT INTERNAL CALENDAR SYNC SERVICE TEST PASSED'
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
