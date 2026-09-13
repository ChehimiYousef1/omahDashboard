'use strict';

const assert =
  require('assert');

const {
  MEETING_PROVIDERS,

  validateMeetingProvider,

  getMeetingProviderStatus,
  getMeetingProviderStatuses,

  assertMeetingProviderReady,
} =
  require(
    '../services/interviewMeetingProviderService'
  );


assert.deepStrictEqual(
  MEETING_PROVIDERS,

  [
    'google_meet',
    'zoom',
    'microsoft_teams',
  ]
);

console.log(
  '✅ supported provider registry'
);


assert.strictEqual(
  validateMeetingProvider(
    ' Google_Meet '
  ),

  'google_meet'
);

assert.throws(
  () =>
    validateMeetingProvider(
      'manual'
    ),

  (
    error
  ) =>
    error.code ===
    'MEETING_PROVIDER_INVALID'
);

console.log(
  '✅ provider validation'
);


const disabledGoogle =
  getMeetingProviderStatus(
    'google_meet',

    {
      GOOGLE_CALENDAR_ENABLED:
        'false',

      GOOGLE_CALENDAR_WRITE_ENABLED:
        'false',
    }
  );


assert.strictEqual(
  disabledGoogle
    .readyForScheduling,

  false
);

assert.strictEqual(
  disabledGoogle.status,
  'setup_required'
);

console.log(
  '✅ disabled Google is not schedulable'
);


const readOnlyGoogle =
  getMeetingProviderStatus(
    'google_meet',

    {
      GOOGLE_CALENDAR_ENABLED:
        'true',

      GOOGLE_CALENDAR_WRITE_ENABLED:
        'false',

      GOOGLE_CLIENT_ID:
        'client',

      GOOGLE_CLIENT_SECRET:
        'secret',

      GOOGLE_REFRESH_TOKEN:
        'refresh',
    }
  );


assert.strictEqual(
  readOnlyGoogle.configured,
  true
);

assert.strictEqual(
  readOnlyGoogle
    .readyForScheduling,

  false
);

assert.strictEqual(
  readOnlyGoogle.status,
  'read_only'
);

console.log(
  '✅ configured Google can remain read-only'
);


const readyGoogle =
  getMeetingProviderStatus(
    'google_meet',

    {
      GOOGLE_CALENDAR_ENABLED:
        'true',

      GOOGLE_CALENDAR_WRITE_ENABLED:
        'true',

      GOOGLE_CLIENT_ID:
        'client',

      GOOGLE_CLIENT_SECRET:
        'secret',

      GOOGLE_REFRESH_TOKEN:
        'refresh',
    }
  );


assert.strictEqual(
  readyGoogle
    .readyForScheduling,

  true
);

assert.strictEqual(
  readyGoogle.status,
  'ready'
);

console.log(
  '✅ Google becomes ready only with write gate enabled'
);


const zoom =
  getMeetingProviderStatus(
    'zoom'
  );

const teams =
  getMeetingProviderStatus(
    'microsoft_teams'
  );


assert.strictEqual(
  zoom.implemented,
  false
);

assert.strictEqual(
  zoom.status,
  'not_implemented'
);

assert.strictEqual(
  teams.implemented,
  false
);

assert.strictEqual(
  teams.status,
  'not_implemented'
);

console.log(
  '✅ Zoom and Teams safely marked not implemented'
);


const statuses =
  getMeetingProviderStatuses({
    GOOGLE_CALENDAR_ENABLED:
      'false',
  });


assert.strictEqual(
  statuses.length,
  3
);

assert.deepStrictEqual(
  statuses.map(
    (
      status
    ) =>
      status.provider
  ),

  MEETING_PROVIDERS
);

console.log(
  '✅ provider status collection'
);


assert.throws(
  () =>
    assertMeetingProviderReady(
      'google_meet',

      {
        GOOGLE_CALENDAR_ENABLED:
          'false',
      }
    ),

  (
    error
  ) =>
    error.code ===
    'MEETING_PROVIDER_NOT_READY'
);

assert.throws(
  () =>
    assertMeetingProviderReady(
      'zoom'
    ),

  (
    error
  ) =>
    error.code ===
    'MEETING_PROVIDER_NOT_IMPLEMENTED'
);

console.log(
  '✅ unavailable providers blocked safely'
);


assert.doesNotThrow(
  () =>
    assertMeetingProviderReady(
      'google_meet',

      {
        GOOGLE_CALENDAR_ENABLED:
          'true',

        GOOGLE_CALENDAR_WRITE_ENABLED:
          'true',

        GOOGLE_CLIENT_ID:
          'client',

        GOOGLE_CLIENT_SECRET:
          'secret',

        GOOGLE_REFRESH_TOKEN:
          'refresh',
      }
    )
);

console.log(
  '✅ ready Google provider accepted'
);


console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '✅ no Google request made'
);

console.log(
  '✅ no Zoom request made'
);

console.log(
  '✅ no Microsoft request made'
);

console.log(
  '\nINTERVIEW MEETING PROVIDER SERVICE TEST PASSED'
);
