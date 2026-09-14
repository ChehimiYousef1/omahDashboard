'use strict';

const assert =
  require('assert');

const {
  buildGoogleProviderInput,
  assertInterviewMeetingReady,
  createInterviewMeeting,
  updateInterviewMeeting,
  cancelInterviewMeeting,
} = require(
  '../services/applicantInterviewMeetingSyncService'
);


const readyEnv = {
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


const applicant = {
  _id:
    'applicant-test-1',

  identity: {
    fullName:
      'Test Applicant',

    email:
      'candidate@example.com',
  },
};


function baseInterview() {
  return {
    _id:
      'interview-test-1',

    type:
      'technical',

    status:
      'scheduled',

    scheduledStart:
      new Date(
        '2026-09-20T10:00:00.000Z'
      ),

    scheduledEnd:
      new Date(
        '2026-09-20T11:00:00.000Z'
      ),

    timezone:
      'Asia/Beirut',

    format:
      'online',

    location:
      '',

    participants: [
      {
        name:
          'Interviewer',

        email:
          'interviewer@example.com',

        participantType:
          'interviewer',
      },
    ],

    organizer: {
      userId:
        'admin-1',

      name:
        'Admin User',

      email:
        'admin@example.com',

      role:
        'Admin',
    },

    meeting: {
      provider:
        'google_meet',

      status:
        'pending',

      providerMeetingId:
        '',

      providerEventId:
        '',

      joinUrl:
        '',

      lastSyncedAt:
        null,

      syncError:
        '',
    },

    meetingLink:
      '',
  };
}


function makeInterviewModel() {
  let lastUpdate =
    null;

  return {
    getLastUpdate() {
      return lastUpdate;
    },

    async findByIdAndUpdate(
      id,
      update,
      options
    ) {
      lastUpdate = {
        id,
        update,
        options,
      };

      return {
        ...baseInterview(),
        ...update.$set,
      };
    },
  };
}


async function main() {

  /*
   * ==========================================
   * PROVIDER PAYLOAD
   * ==========================================
   */
  const providerInput =
    buildGoogleProviderInput({
      interview:
        baseInterview(),

      applicant,
    });

  assert.strictEqual(
    providerInput
      .interviewId,

    'interview-test-1'
  );

  assert.strictEqual(
    providerInput
      .applicantName,

    'Test Applicant'
  );

  assert.strictEqual(
    providerInput
      .applicantEmail,

    'candidate@example.com'
  );

  assert.strictEqual(
    providerInput
      .organizerEmail,

    'admin@example.com'
  );

  assert.strictEqual(
    providerInput
      .timezone,

    'Asia/Beirut'
  );

  assert.strictEqual(
    providerInput
      .participants
      .length,

    1
  );

  console.log(
    '✅ applicant/provider payload mapping'
  );


  /*
   * ==========================================
   * PROVIDER READINESS
   * ==========================================
   */
  assert.doesNotThrow(
    () =>
      assertInterviewMeetingReady({
        format:
          'online',

        provider:
          'google_meet',

        env:
          readyEnv,
      })
  );


  assert.throws(
    () =>
      assertInterviewMeetingReady({
        format:
          'online',

        provider:
          'google_meet',

        env: {
          ...readyEnv,

          GOOGLE_CALENDAR_WRITE_ENABLED:
            'false',
        },
      }),

    (
      error
    ) =>
      error.code ===
      'MEETING_PROVIDER_NOT_READY'
  );


  assert.strictEqual(
    assertInterviewMeetingReady({
      format:
        'onsite',

      provider:
        'none',

      env: {
        ...readyEnv,

        GOOGLE_CALENDAR_WRITE_ENABLED:
          'false',
      },
    }),

    null
  );

  console.log(
    '✅ provider readiness gate'
  );


  /*
   * ==========================================
   * CREATE SYNCHRONIZATION
   * ==========================================
   */
  const createModel =
    makeInterviewModel();

  let createCalls =
    0;

  const created =
    await createInterviewMeeting({
      interview:
        baseInterview(),

      applicant,

      env:
        readyEnv,

      InterviewModel:
        createModel,

      createGoogleMeeting:
        async (
          payload
        ) => {
          createCalls +=
            1;

          assert.strictEqual(
            payload
              .applicantEmail,

            'candidate@example.com'
          );

          assert.strictEqual(
            payload
              .organizerEmail,

            'admin@example.com'
          );

          return {
            provider:
              'google_meet',

            status:
              'created',

            providerMeetingId:
              'meet-1',

            providerEventId:
              'event-1',

            joinUrl:
              'https://meet.google.com/test-meet',

            syncError:
              '',
          };
        },

      now:
        () =>
          new Date(
            '2026-09-14T12:00:00.000Z'
          ),
    });


  assert.strictEqual(
    createCalls,
    1
  );

  assert.strictEqual(
    created
      .meeting
      .provider,

    'google_meet'
  );

  assert.strictEqual(
    created
      .meeting
      .status,

    'created'
  );

  assert.strictEqual(
    created
      .meeting
      .providerMeetingId,

    'meet-1'
  );

  assert.strictEqual(
    created
      .meeting
      .providerEventId,

    'event-1'
  );

  assert.strictEqual(
    created
      .meeting
      .joinUrl,

    'https://meet.google.com/test-meet'
  );

  assert.strictEqual(
    created
      .meetingLink,

    'https://meet.google.com/test-meet'
  );

  assert.strictEqual(
    created
      .meeting
      .lastSyncedAt
      .toISOString(),

    '2026-09-14T12:00:00.000Z'
  );

  console.log(
    '✅ create sync persists Meet metadata'
  );


  /*
   * ==========================================
   * CREATE FAILURE
   * ==========================================
   *
   * Provider failure must not make
   * the local interview disappear.
   */
  const failedModel =
    makeInterviewModel();

  const failed =
    await createInterviewMeeting({
      interview:
        baseInterview(),

      applicant,

      env:
        readyEnv,

      InterviewModel:
        failedModel,

      createGoogleMeeting:
        async () => {
          throw new Error(
            'Synthetic Google failure'
          );
        },
    });


  assert.strictEqual(
    failed
      .meeting
      .status,

    'error'
  );

  assert.match(
    failed
      .meeting
      .syncError,

    /Synthetic Google failure/
  );

  assert.strictEqual(
    failed
      .meetingLink,

    ''
  );

  console.log(
    '✅ provider failure preserved as sync error'
  );


  /*
   * ==========================================
   * RESCHEDULE SAME EVENT
   * ==========================================
   */
  const existing =
    baseInterview();

  existing.meeting = {
    ...existing.meeting,

    status:
      'created',

    providerMeetingId:
      'meet-1',

    providerEventId:
      'event-1',

    joinUrl:
      'https://meet.google.com/test-meet',
  };

  existing.meetingLink =
    existing.meeting
      .joinUrl;


  const updateModel =
    makeInterviewModel();

  let updateCalls =
    0;

  let patchedEventId =
    '';


  const rescheduled =
    await updateInterviewMeeting({
      interview:
        existing,

      applicant,

      env:
        readyEnv,

      InterviewModel:
        updateModel,

      updateGoogleMeeting:
        async (
          payload
        ) => {
          updateCalls +=
            1;

          patchedEventId =
            payload
              .providerEventId;

          return {
            provider:
              'google_meet',

            status:
              'created',

            providerMeetingId:
              'meet-1',

            providerEventId:
              'event-1',

            joinUrl:
              'https://meet.google.com/test-meet',

            syncError:
              '',
          };
        },
    });


  assert.strictEqual(
    updateCalls,
    1
  );

  assert.strictEqual(
    patchedEventId,
    'event-1'
  );

  assert.strictEqual(
    rescheduled
      .meeting
      .providerMeetingId,

    'meet-1'
  );

  assert.strictEqual(
    rescheduled
      .meeting
      .providerEventId,

    'event-1'
  );

  assert.strictEqual(
    rescheduled
      .meeting
      .joinUrl,

    'https://meet.google.com/test-meet'
  );

  assert.strictEqual(
    rescheduled
      .meetingLink,

    'https://meet.google.com/test-meet'
  );

  console.log(
    '✅ reschedule patches same provider event'
  );


  /*
   * ==========================================
   * RETRY CREATE IF EVENT ID IS MISSING
   * ==========================================
   */
  const retryInterview =
    baseInterview();

  retryInterview.meeting = {
    ...retryInterview.meeting,

    status:
      'error',

    syncError:
      'Previous failure',
  };


  const retryModel =
    makeInterviewModel();

  let retryCreateCalls =
    0;

  let retryUpdateCalls =
    0;


  const retried =
    await updateInterviewMeeting({
      interview:
        retryInterview,

      applicant,

      env:
        readyEnv,

      InterviewModel:
        retryModel,

      createGoogleMeeting:
        async () => {
          retryCreateCalls +=
            1;

          return {
            provider:
              'google_meet',

            status:
              'created',

            providerMeetingId:
              'meet-retry',

            providerEventId:
              'event-retry',

            joinUrl:
              'https://meet.google.com/retry-meet',

            syncError:
              '',
          };
        },

      updateGoogleMeeting:
        async () => {
          retryUpdateCalls +=
            1;

          throw new Error(
            'Update must not be called without an event ID.'
          );
        },
    });


  assert.strictEqual(
    retryCreateCalls,
    1
  );

  assert.strictEqual(
    retryUpdateCalls,
    0
  );

  assert.strictEqual(
    retried
      .meeting
      .providerEventId,

    'event-retry'
  );

  console.log(
    '✅ missing event ID safely retries creation'
  );


  /*
   * ==========================================
   * CANCEL SYNCHRONIZATION
   * ==========================================
   */
  const cancelModel =
    makeInterviewModel();

  let cancelCalls =
    0;

  let deletedEventId =
    '';


  const cancelled =
    await cancelInterviewMeeting({
      interview:
        existing,

      env:
        readyEnv,

      InterviewModel:
        cancelModel,

      cancelGoogleMeeting:
        async ({
          providerEventId,
        }) => {
          cancelCalls +=
            1;

          deletedEventId =
            providerEventId;

          return {
            provider:
              'google_meet',

            status:
              'cancelled',
          };
        },
    });


  assert.strictEqual(
    cancelCalls,
    1
  );

  assert.strictEqual(
    deletedEventId,
    'event-1'
  );

  assert.strictEqual(
    cancelled
      .meeting
      .status,

    'cancelled'
  );

  /*
   * IDs remain available for
   * auditing and traceability.
   */
  assert.strictEqual(
    cancelled
      .meeting
      .providerEventId,

    'event-1'
  );

  assert.strictEqual(
    cancelled
      .meeting
      .providerMeetingId,

    'meet-1'
  );

  assert.strictEqual(
    cancelled
      .meeting
      .joinUrl,

    ''
  );

  assert.strictEqual(
    cancelled
      .meetingLink,

    ''
  );

  console.log(
    '✅ cancellation preserves IDs and clears join URL'
  );


  /*
   * ==========================================
   * WRITE-DISABLED CANCELLATION
   * ==========================================
   *
   * The provider must not be called
   * when the safety gate is closed.
   */
  const blockedModel =
    makeInterviewModel();

  let blockedProviderCall =
    false;


  const blocked =
    await cancelInterviewMeeting({
      interview:
        existing,

      env: {
        ...readyEnv,

        GOOGLE_CALENDAR_WRITE_ENABLED:
          'false',
      },

      InterviewModel:
        blockedModel,

      cancelGoogleMeeting:
        async () => {
          blockedProviderCall =
            true;

          throw new Error(
            'Provider must not execute'
          );
        },
    });


  assert.strictEqual(
    blockedProviderCall,
    false
  );

  assert.strictEqual(
    blocked
      .meeting
      .status,

    'error'
  );

  assert.strictEqual(
    blocked
      .meeting
      .providerEventId,

    'event-1'
  );

  assert.match(
    blocked
      .meeting
      .syncError,

    /not configured for automatic meeting creation/i
  );

  console.log(
    '✅ disabled writes preserve cleanup state safely'
  );


  /*
   * ==========================================
   * NON-ONLINE INTERVIEW
   * ==========================================
   */
  const onsite =
    baseInterview();

  onsite.format =
    'onsite';

  onsite.meeting = {
    provider:
      'none',

    status:
      'not_required',

    providerMeetingId:
      '',

    providerEventId:
      '',

    joinUrl:
      '',

    lastSyncedAt:
      null,

    syncError:
      '',
  };


  let onsiteGoogleCall =
    false;


  const onsiteResult =
    await createInterviewMeeting({
      interview:
        onsite,

      applicant,

      env:
        readyEnv,

      createGoogleMeeting:
        async () => {
          onsiteGoogleCall =
            true;

          throw new Error(
            'Google must not be called for onsite interviews.'
          );
        },
    });


  assert.strictEqual(
    onsiteGoogleCall,
    false
  );

  assert.strictEqual(
    onsiteResult,
    onsite
  );

  console.log(
    '✅ non-online interviews skip provider sync'
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
    '\nAPPLICANT INTERVIEW MEETING SYNC SERVICE TEST PASSED'
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
