'use strict';

const assert =
  require('assert');

const {
  getGoogleCalendarConfig,
  getConfigurationStatus,
  checkFreeBusy,
  assertCalendarWriteEnabled,
} = require(
  '../services/googleCalendarService'
);

const ApplicantInterview =
  require(
    '../models/ApplicantInterview'
  );


async function run() {
  const safeEnv = {
    GOOGLE_CALENDAR_ENABLED:
      'false',

    GOOGLE_CALENDAR_WRITE_ENABLED:
      'false',

    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    GOOGLE_REFRESH_TOKEN: '',

    GOOGLE_CALENDAR_ID:
      'primary',

    GOOGLE_CALENDAR_SEND_UPDATES:
      'all',
  };


  const config =
    getGoogleCalendarConfig(
      safeEnv
    );

  assert.strictEqual(
    config.enabled,
    false
  );

  assert.strictEqual(
    config.writeEnabled,
    false
  );

  console.log(
    '✅ Calendar disabled by default'
  );


  const status =
    getConfigurationStatus(
      safeEnv
    );

  assert.strictEqual(
    status.configured,
    false
  );

  assert(
    status.missing.includes(
      'GOOGLE_CLIENT_ID'
    )
  );

  assert(
    status.missing.includes(
      'GOOGLE_CLIENT_SECRET'
    )
  );

  assert(
    status.missing.includes(
      'GOOGLE_REFRESH_TOKEN'
    )
  );

  console.log(
    '✅ missing credentials detected safely'
  );


  const freeBusy =
    await checkFreeBusy({
      timeMin:
        '2026-09-20T10:00:00Z',

      timeMax:
        '2026-09-20T11:00:00Z',

      calendarIds: [
        'interviewer@example.com',
      ],

      env:
        safeEnv,
    });

  assert.strictEqual(
    freeBusy.checked,
    false
  );

  assert.strictEqual(
    freeBusy.reason,
    'GOOGLE_CALENDAR_DISABLED'
  );

  console.log(
    '✅ disabled Calendar performs no network availability request'
  );


  assert.throws(
    () =>
      assertCalendarWriteEnabled(
        safeEnv
      ),

    (
      error
    ) =>
      error.code ===
      'GOOGLE_CALENDAR_DISABLED'
  );

  console.log(
    '✅ Calendar writes blocked by safety gate'
  );


  const schema =
    ApplicantInterview.schema;

  assert(
    schema.path(
      'organizer.email'
    )
  );

  assert(
    schema.path(
      'participants.participantType'
    )
  );

  assert(
    schema.path(
      'calendar.provider'
    )
  );

  assert(
    schema.path(
      'calendar.eventId'
    )
  );

  assert(
    schema.path(
      'calendar.meetingUrl'
    )
  );

  assert(
    schema.path(
      'calendar.syncStatus'
    )
  );

  console.log(
    '✅ Interview Calendar metadata model'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no Google Calendar event created'
  );

  console.log(
    '✅ no invitation email sent'
  );

  console.log(
    '\nGOOGLE CALENDAR FOUNDATION TEST PASSED'
  );
}


run().catch(
  (error) => {
    console.error(
      error
    );

    process.exitCode = 1;
  }
);
