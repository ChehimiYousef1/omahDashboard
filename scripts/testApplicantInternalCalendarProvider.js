'use strict';

const assert =
  require('assert');

const {
  buildApplicantInternalCalendarEvent,
  reminderConfiguration,

  createApplicantInternalCalendarEvent,
  updateApplicantInternalCalendarEvent,
  deleteApplicantInternalCalendarEvent,
} = require(
  '../services/applicantInternalCalendarProvider'
);


const enabledEnv = {
  GOOGLE_CALENDAR_ENABLED:
    'true',

  GOOGLE_CALENDAR_WRITE_ENABLED:
    'true',

  GOOGLE_CLIENT_ID:
    'test-client-id',

  GOOGLE_CLIENT_SECRET:
    'test-client-secret',

  GOOGLE_REFRESH_TOKEN:
    'test-refresh-token',

  GOOGLE_CALENDAR_ID:
    'test-calendar',

  GOOGLE_CALENDAR_SEND_UPDATES:
    'none',
};


function mockCalendar() {
  const calls = {
    insert: [],
    patch: [],
    delete: [],
  };

  return {
    calls,

    client: {
      events: {
        async insert(
          options
        ) {
          calls.insert.push(
            options
          );

          return {
            data: {
              id:
                'event-create-1',

              htmlLink:
                'https://calendar.google.test/event-create-1',
            },
          };
        },

        async patch(
          options
        ) {
          calls.patch.push(
            options
          );

          return {
            data: {
              id:
                options.eventId,

              htmlLink:
                'https://calendar.google.test/event-update-1',
            },
          };
        },

        async delete(
          options
        ) {
          calls.delete.push(
            options
          );

          return {
            data: {},
          };
        },
      },
    },
  };
}


async function run() {
  const event =
    buildApplicantInternalCalendarEvent({
      applicantId:
        'applicant-1',

      applicantName:
        'Test Applicant',

      noteId:
        'note-1',

      kind:
        'task',

      content:
        'Review the Applicant portfolio and prepare interview feedback.',

      startAt:
        '2026-09-18T09:00:00.000Z',

      endAt:
        '2026-09-18T10:00:00.000Z',

      reminderAt:
        '2026-09-18T08:30:00.000Z',

      reminderNote:
        'Review CV before starting.',
    });

  assert.strictEqual(
    event.start.dateTime,
    '2026-09-18T09:00:00.000Z'
  );

  assert.strictEqual(
    event.end.dateTime,
    '2026-09-18T10:00:00.000Z'
  );

  assert.strictEqual(
    event.reminders
      .overrides[0]
      .minutes,
    30
  );

  assert.strictEqual(
    event.extendedProperties
      .private
      .applicantId,
    'applicant-1'
  );

  assert.strictEqual(
    event.extendedProperties
      .private
      .noteId,
    'note-1'
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty.call(
        event,
        'attendees'
      ),
    false
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty.call(
        event,
        'conferenceData'
      ),
    false
  );

  console.log(
    '✅ internal Calendar event payload'
  );


  const noGoogleReminder =
    reminderConfiguration({
      startAt:
        '2026-09-18T09:00:00.000Z',

      reminderAt:
        '2026-09-18T09:30:00.000Z',
    });

  assert.strictEqual(
    noGoogleReminder,
    undefined
  );

  console.log(
    '✅ invalid Google reminder offset safely omitted'
  );


  assert.throws(
    () =>
      buildApplicantInternalCalendarEvent({
        startAt:
          '2026-09-18T10:00:00.000Z',

        endAt:
          '2026-09-18T09:00:00.000Z',
      }),

    error =>
      error.code ===
      'APPLICANT_INTERNAL_CALENDAR_RANGE_INVALID'
  );

  console.log(
    '✅ invalid Calendar range blocked'
  );


  const createdMock =
    mockCalendar();

  const created =
    await createApplicantInternalCalendarEvent({
      applicantId:
        'applicant-1',

      applicantName:
        'Test Applicant',

      noteId:
        'note-1',

      kind:
        'task',

      content:
        'Review portfolio',

      startAt:
        '2026-09-18T09:00:00.000Z',

      endAt:
        '2026-09-18T10:00:00.000Z',

      reminderAt:
        '2026-09-18T08:45:00.000Z',

      env:
        enabledEnv,

      calendarClient:
        createdMock.client,
    });

  assert.strictEqual(
    createdMock.calls
      .insert.length,
    1
  );

  assert.strictEqual(
    createdMock.calls
      .insert[0]
      .calendarId,
    'test-calendar'
  );

  assert.strictEqual(
    createdMock.calls
      .insert[0]
      .sendUpdates,
    'none'
  );

  assert.strictEqual(
    created.eventId,
    'event-create-1'
  );

  assert.strictEqual(
    created.syncStatus,
    'synced'
  );

  console.log(
    '✅ mocked Calendar create'
  );


  const updatedMock =
    mockCalendar();

  const updated =
    await updateApplicantInternalCalendarEvent({
      providerEventId:
        'event-existing',

      applicantId:
        'applicant-1',

      applicantName:
        'Test Applicant',

      noteId:
        'note-1',

      kind:
        'task',

      content:
        'Updated review task',

      startAt:
        '2026-09-18T10:00:00.000Z',

      endAt:
        '2026-09-18T11:00:00.000Z',

      env:
        enabledEnv,

      calendarClient:
        updatedMock.client,
    });

  assert.strictEqual(
    updatedMock.calls
      .patch.length,
    1
  );

  assert.strictEqual(
    updatedMock.calls
      .patch[0]
      .eventId,
    'event-existing'
  );

  assert.strictEqual(
    updated.eventId,
    'event-existing'
  );

  console.log(
    '✅ mocked Calendar update'
  );


  const deletedMock =
    mockCalendar();

  const deleted =
    await deleteApplicantInternalCalendarEvent({
      providerEventId:
        'event-existing',

      env:
        enabledEnv,

      calendarClient:
        deletedMock.client,
    });

  assert.strictEqual(
    deletedMock.calls
      .delete.length,
    1
  );

  assert.strictEqual(
    deletedMock.calls
      .delete[0]
      .eventId,
    'event-existing'
  );

  assert.strictEqual(
    deleted.syncStatus,
    'not_synced'
  );

  console.log(
    '✅ mocked Calendar delete'
  );


  const disabledMock =
    mockCalendar();

  await assert.rejects(
    () =>
      createApplicantInternalCalendarEvent({
        startAt:
          '2026-09-18T09:00:00.000Z',

        endAt:
          '2026-09-18T10:00:00.000Z',

        env: {
          ...enabledEnv,

          GOOGLE_CALENDAR_WRITE_ENABLED:
            'false',
        },

        calendarClient:
          disabledMock.client,
      }),

    error =>
      error.code ===
      'GOOGLE_CALENDAR_WRITE_DISABLED'
  );

  assert.strictEqual(
    disabledMock.calls
      .insert.length,
    0
  );

  console.log(
    '✅ write-disabled guard blocks create before provider call'
  );


  assert.strictEqual(
    createdMock.calls
      .insert.length +
      updatedMock.calls
        .patch.length +
      deletedMock.calls
        .delete.length,
    3
  );

  console.log(
    '✅ all Calendar calls used injected mocks'
  );

  console.log(
    '\nAPPLICANT INTERNAL CALENDAR PROVIDER TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      error
    );

    process.exitCode = 1;
  }
);
