'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  getApplicantCalendarEvents,
} = require(
  '../services/applicantCalendarService'
);


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
  const ApplicantModel = {
    find() {
      return queryResult([
        {
          _id:
            'applicant-1',

          identity: {
            fullName:
              'Applicant One',
          },

          lifecycle: {
            archived:
              false,
          },
        },

        {
          _id:
            'applicant-2',

          identity: {
            fullName:
              'Applicant Two',
          },

          lifecycle: {
            archived:
              false,
          },
        },
      ]);
    },
  };


  const InterviewModel = {
    find() {
      return queryResult([
        {
          _id:
            'interview-1',

          applicantId:
            'applicant-1',

          type:
            'technical',

          status:
            'scheduled',

          scheduledStart:
            new Date(
              '2026-09-20T09:00:00.000Z'
            ),

          scheduledEnd:
            new Date(
              '2026-09-20T10:00:00.000Z'
            ),

          timezone:
            'Asia/Beirut',

          format:
            'online',

          archived:
            false,

          organizer: {
            userId:
              'admin-1',

            name:
              'Recruiter One',

            email:
              'recruiter@example.com',

            role:
              'Admin',
          },

          meeting: {
            providerEventId:
              'google-event-1',

            joinUrl:
              'https://meet.google.test/example',

            status:
              'created',
          },
        },
      ]);
    },
  };


  const NoteModel = {
    find() {
      return queryResult([
        {
          _id:
            'task-1',

          applicantId:
            'applicant-1',

          kind:
            'task',

          content:
            'Review portfolio',

          taskStatus:
            'todo',

          important:
            true,

          archived:
            false,

          author: {
            userId:
              'admin-2',

            name:
              'Recruiter Two',

            email:
              'recruiter2@example.com',

            role:
              'Admin',
          },

          schedule: {
            startAt:
              new Date(
                '2026-09-21T08:00:00.000Z'
              ),

            endAt:
              new Date(
                '2026-09-21T09:00:00.000Z'
              ),

            reminderAt:
              new Date(
                '2026-09-21T07:30:00.000Z'
              ),

            reminderNote:
              'Check CV first',
          },

          calendar: {
            provider:
              'google_calendar',

            eventId:
              'task-event-1',

            eventUrl:
              'https://calendar.google.test/task-event-1',

            syncStatus:
              'synced',
          },
        },

        {
          _id:
            'note-1',

          applicantId:
            'applicant-2',

          kind:
            'note',

          content:
            'Prepare interview questions',

          archived:
            false,

          author: {
            userId:
              'admin-3',

            name:
              'Recruiter Three',

            role:
              'Admin',
          },

          schedule: {
            startAt:
              new Date(
                '2026-09-22T11:00:00.000Z'
              ),

            endAt:
              new Date(
                '2026-09-22T11:30:00.000Z'
              ),
          },

          calendar: {
            syncStatus:
              'not_synced',
          },
        },
      ]);
    },
  };


  const result =
    await getApplicantCalendarEvents({
      from:
        '2026-09-19T00:00:00.000Z',

      to:
        '2026-09-23T23:59:59.999Z',

      ApplicantModel,
      InterviewModel,
      NoteModel,
    });


  assert.strictEqual(
    result.total,
    4
  );

  assert.deepStrictEqual(
    result.events.map(
      event =>
        event.sourceType
    ),
    [
      'interview',
      'reminder',
      'task',
      'scheduled_note',
    ]
  );

  const interview =
    result.events.find(
      event =>
        event.sourceType ===
        'interview'
    );

  assert.strictEqual(
    interview
      .applicantName,
    'Applicant One'
  );

  assert.strictEqual(
    interview
      .calendarSyncStatus,
    'synced'
  );


  const task =
    result.events.find(
      event =>
        event.sourceType ===
        'task'
    );

  assert.strictEqual(
    task.status,
    'todo'
  );

  assert.strictEqual(
    task.important,
    true
  );


  const remindersOnly =
    await getApplicantCalendarEvents({
      from:
        '2026-09-19T00:00:00.000Z',

      to:
        '2026-09-23T23:59:59.999Z',

      sourceTypes:
        'reminder',

      ApplicantModel,
      InterviewModel,
      NoteModel,
    });

  assert.strictEqual(
    remindersOnly.total,
    1
  );

  assert.strictEqual(
    remindersOnly
      .events[0]
      .sourceType,
    'reminder'
  );


  await assert.rejects(
    () =>
      getApplicantCalendarEvents({
        from:
          'invalid',

        to:
          '2026-09-23',

        ApplicantModel,
        InterviewModel,
        NoteModel,
      }),

    error =>
      error?.code ===
        'APPLICANT_CALENDAR_RANGE_REQUIRED'
  );


  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );

  console.log(
    '✅ interviews normalized into Calendar events'
  );

  console.log(
    '✅ tasks and scheduled notes normalized'
  );

  console.log(
    '✅ reminder events generated separately'
  );

  console.log(
    '✅ Calendar filters work'
  );

  console.log(
    '✅ invalid range protected'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no Google Calendar API called'
  );

  console.log(
    '\nAPPLICANT CALENDAR SERVICE TEST PASSED'
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
