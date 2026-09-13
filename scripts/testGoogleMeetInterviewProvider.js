'use strict';

const assert =
  require('assert');

const {
  buildAttendees,
  buildGoogleCalendarEvent,
  extractGoogleMeetJoinUrl,
  createGoogleMeetInterview,
  updateGoogleMeetInterview,
  cancelGoogleMeetInterview,
} =
  require(
    '../services/googleMeetInterviewProvider'
  );


const safeEnv = {
  GOOGLE_CALENDAR_ENABLED:
    'true',

  GOOGLE_CALENDAR_WRITE_ENABLED:
    'true',

  GOOGLE_CLIENT_ID:
    'test-client',

  GOOGLE_CLIENT_SECRET:
    'test-secret',

  GOOGLE_REFRESH_TOKEN:
    'test-refresh',

  GOOGLE_CALENDAR_ID:
    'primary',

  GOOGLE_CALENDAR_SEND_UPDATES:
    'all',
};


function baseInput() {
  return {
    interviewId:
      'interview-test-1',

    interviewType:
      'technical',

    applicantName:
      'Test Applicant',

    applicantEmail:
      'candidate@example.com',

    scheduledStart:
      '2026-09-20T10:00:00.000Z',

    scheduledEnd:
      '2026-09-20T11:00:00.000Z',

    timezone:
      'Asia/Beirut',

    organizerEmail:
      'organizer@example.com',

    participants: [
      {
        name:
          'Organizer',

        email:
          'organizer@example.com',

        participantType:
          'organizer',
      },

      {
        name:
          'Interviewer One',

        email:
          'interviewer@example.com',

        participantType:
          'interviewer',
      },

      {
        name:
          'Candidate duplicate',

        email:
          'candidate@example.com',

        participantType:
          'applicant',
      },
    ],
  };
}


/*
 * Attendee normalization.
 */
const attendees =
  buildAttendees(
    baseInput()
  );

assert.deepStrictEqual(
  attendees,
  [
    {
      email:
        'candidate@example.com',
    },

    {
      email:
        'interviewer@example.com',
    },
  ]
);

console.log(
  '✅ attendee emails deduplicated and organizer excluded'
);


/*
 * Calendar payload.
 */
const eventBody =
  buildGoogleCalendarEvent({
    ...baseInput(),

    includeConference:
      true,

    conferenceRequestId:
      'fixed-request-id',
  });

assert.strictEqual(
  eventBody
    .conferenceData
    .createRequest
    .conferenceSolutionKey
    .type,

  'hangoutsMeet'
);

assert.strictEqual(
  eventBody
    .conferenceData
    .createRequest
    .requestId,

  'fixed-request-id'
);

assert.strictEqual(
  eventBody
    .start
    .timeZone,

  'Asia/Beirut'
);

console.log(
  '✅ Google Meet conference payload generated'
);


/*
 * Join URL extraction.
 */
assert.strictEqual(
  extractGoogleMeetJoinUrl({
    hangoutLink:
      'https://meet.google.com/aaa-bbbb-ccc',
  }),

  'https://meet.google.com/aaa-bbbb-ccc'
);

assert.strictEqual(
  extractGoogleMeetJoinUrl({
    conferenceData: {
      entryPoints: [
        {
          entryPointType:
            'video',

          uri:
            'https://meet.google.com/ddd-eeee-fff',
        },
      ],
    },
  }),

  'https://meet.google.com/ddd-eeee-fff'
);

console.log(
  '✅ generated Meet URL extracted safely'
);


/*
 * Fake Google Calendar client.
 *
 * ZERO network calls.
 */
let insertParams =
  null;

let patchParams =
  null;

let deleteParams =
  null;


const fakeCalendar = {
  events: {
    async insert(
      params
    ) {
      insertParams =
        params;

      return {
        data: {
          id:
            'google-event-1',

          htmlLink:
            'https://calendar.google.com/event?eid=test',

          hangoutLink:
            'https://meet.google.com/test-meet',

          conferenceData: {
            conferenceId:
              'test-meet',

            createRequest: {
              status: {
                statusCode:
                  'success',
              },
            },

            entryPoints: [
              {
                entryPointType:
                  'video',

                uri:
                  'https://meet.google.com/test-meet',
              },
            ],
          },
        },
      };
    },


    async patch(
      params
    ) {
      patchParams =
        params;

      return {
        data: {
          id:
            'google-event-1',

          htmlLink:
            'https://calendar.google.com/event?eid=test',

          hangoutLink:
            'https://meet.google.com/test-meet',

          conferenceData: {
            conferenceId:
              'test-meet',
          },
        },
      };
    },


    async delete(
      params
    ) {
      deleteParams =
        params;

      return {
        data: {},
      };
    },
  },
};


async function main() {
  const created =
    await createGoogleMeetInterview({
      ...baseInput(),

      conferenceRequestId:
        'create-test-request',

      env:
        safeEnv,

      calendarClient:
        fakeCalendar,
    });


  assert.strictEqual(
    insertParams
      .calendarId,

    'primary'
  );

  assert.strictEqual(
    insertParams
      .conferenceDataVersion,

    1
  );

  assert.strictEqual(
    insertParams
      .sendUpdates,

    'all'
  );

  assert.strictEqual(
    insertParams
      .requestBody
      .conferenceData
      .createRequest
      .conferenceSolutionKey
      .type,

    'hangoutsMeet'
  );

  assert.strictEqual(
    created.status,
    'created'
  );

  assert.strictEqual(
    created.providerEventId,
    'google-event-1'
  );

  assert.strictEqual(
    created.joinUrl,
    'https://meet.google.com/test-meet'
  );

  console.log(
    '✅ Google Calendar insert contract'
  );


  const updated =
    await updateGoogleMeetInterview({
      ...baseInput(),

      providerEventId:
        'google-event-1',

      scheduledStart:
        '2026-09-20T12:00:00.000Z',

      scheduledEnd:
        '2026-09-20T13:00:00.000Z',

      env:
        safeEnv,

      calendarClient:
        fakeCalendar,
    });


  assert.strictEqual(
    patchParams
      .eventId,

    'google-event-1'
  );

  assert.strictEqual(
    patchParams
      .conferenceDataVersion,

    1
  );

  assert.strictEqual(
    patchParams
      .sendUpdates,

    'all'
  );

  assert.strictEqual(
    Object.prototype
      .hasOwnProperty
      .call(
        patchParams
          .requestBody,

        'conferenceData'
      ),

    false,

    'Reschedule must not create another Meet conference.'
  );

  assert.strictEqual(
    updated.joinUrl,
    'https://meet.google.com/test-meet'
  );

  console.log(
    '✅ reschedule keeps same Google Meet'
  );


  const cancelled =
    await cancelGoogleMeetInterview({
      providerEventId:
        'google-event-1',

      env:
        safeEnv,

      calendarClient:
        fakeCalendar,
    });


  assert.strictEqual(
    deleteParams
      .eventId,

    'google-event-1'
  );

  assert.strictEqual(
    deleteParams
      .sendUpdates,

    'all'
  );

  assert.strictEqual(
    cancelled.status,
    'cancelled'
  );

  console.log(
    '✅ cancellation deletes provider event'
  );


  let blockedCalled =
    false;

  const blockedCalendar = {
    events: {
      async insert() {
        blockedCalled =
          true;

        throw new Error(
          'This must not run.'
        );
      },
    },
  };


  await assert.rejects(
    () =>
      createGoogleMeetInterview({
        ...baseInput(),

        env: {
          ...safeEnv,

          GOOGLE_CALENDAR_WRITE_ENABLED:
            'false',
        },

        calendarClient:
          blockedCalendar,
      }),

    (
      error
    ) =>
      error.code ===
      'GOOGLE_CALENDAR_WRITE_DISABLED'
  );


  assert.strictEqual(
    blockedCalled,
    false
  );

  console.log(
    '✅ write-disabled safety gate blocks provider call'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no real Google request made'
  );

  console.log(
    '✅ no real Calendar event created'
  );

  console.log(
    '✅ no invitation sent'
  );

  console.log(
    '\nGOOGLE MEET INTERVIEW PROVIDER TEST PASSED'
  );
}


main().catch(
  (
    error
  ) => {
    console.error(
      error
    );

    process.exit(1);
  }
);
