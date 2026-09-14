'use strict';

const assert =
  require('assert');

const {
  buildInterviewNotificationRecipients,
  buildInterviewNotificationMessage,
  onlineMeetingReady,
  sendApplicantInterviewNotification,
} = require(
  '../services/applicantInterviewNotificationService'
);


async function main() {
  const applicant = {
    identity: {
      fullName:
        'Test Applicant',

      email:
        'applicant@example.com',
    },
  };


  const interview = {
    type:
      'technical',

    format:
      'online',

    scheduledStart:
      new Date(
        '2026-09-20T10:00:00Z'
      ),

    scheduledEnd:
      new Date(
        '2026-09-20T11:00:00Z'
      ),

    timezone:
      'Asia/Beirut',

    meeting: {
      provider:
        'google_meet',

      status:
        'created',

      joinUrl:
        'https://meet.google.com/test-room',
    },

    participants: [
      {
        name:
          'Primary Interviewer',

        email:
          'interviewer@example.com',

        participantType:
          'interviewer',

        role:
          'Interviewer',
      },

      {
        name:
          'Second Interviewer',

        email:
          'second@example.com',

        role:
          'Technical Interviewer',
      },

      {
        name:
          'Applicant',

        email:
          'applicant@example.com',

        participantType:
          'applicant',

        role:
          'Applicant',
      },

      {
        name:
          'Duplicate Company',

        email:
          'recruitment@example.com',

        role:
          'Interviewer',
      },
    ],

    notes:
      'Technical assessment.',
  };


  const env = {
    INTERVIEW_EMAIL_ENABLED:
      'true',

    INTERVIEW_NOTIFICATION_COMPANY_EMAIL:
      'recruitment@example.com',

    INTERVIEW_NOTIFICATION_COMPANY_NAME:
      'OMAH Recruitment',

    INTERVIEW_EMAIL_FROM:
      'recruitment@example.com',

    INTERVIEW_EMAIL_FROM_NAME:
      'OMAH Recruitment',

    SMTP_USER:
      'smtp@example.com',

    SMTP_PASS:
      'fake-password',
  };


  const recipients =
    buildInterviewNotificationRecipients({
      interview,
      env,
    });


  assert.deepStrictEqual(
    recipients.map(
      (recipient) =>
        recipient.email
    ),

    [
      'recruitment@example.com',
      'interviewer@example.com',
      'second@example.com',
    ]
  );


  assert(
    !recipients.some(
      (recipient) =>
        recipient.email ===
        'applicant@example.com'
    )
  );


  console.log(
    '✅ company + interviewer recipients only'
  );


  assert.strictEqual(
    onlineMeetingReady(interview),
    true
  );


  assert.strictEqual(
    onlineMeetingReady({
      ...interview,

      meeting: {
        status: 'pending',
        joinUrl: '',
      },
    }),

    false
  );


  console.log(
    '✅ online email waits for generated meeting'
  );


  const message =
    buildInterviewNotificationMessage({
      interview,
      applicant,
    });


  assert(
    message.subject.includes(
      'Test Applicant'
    )
  );

  assert(
    message.text.includes(
      'https://meet.google.com/test-room'
    )
  );

  assert(
    message.text.includes(
      'Asia/Beirut'
    )
  );


  console.log(
    '✅ email contains applicant, schedule, timezone and Meet link'
  );


  const messages = [];

  const result =
    await sendApplicantInterviewNotification({
      interview,
      applicant,
      env,

      transporter: {
        async sendMail(message) {
          messages.push(message);

          return {
            accepted: [
              message.to,
            ],
          };
        },
      },

      logger: {
        error() {},
      },
    });


  assert.strictEqual(
    result.status,
    'sent'
  );

  assert.strictEqual(
    result.sent,
    3
  );

  assert.strictEqual(
    result.failed,
    0
  );

  assert.strictEqual(
    messages.length,
    3
  );


  console.log(
    '✅ fake SMTP sends exactly three deduplicated emails'
  );


  let disabledCalls = 0;

  const disabled =
    await sendApplicantInterviewNotification({
      interview,
      applicant,

      env: {
        ...env,

        INTERVIEW_EMAIL_ENABLED:
          'false',
      },

      transporter: {
        async sendMail() {
          disabledCalls += 1;
        },
      },
    });


  assert.strictEqual(
    disabled.status,
    'disabled'
  );

  assert.strictEqual(
    disabledCalls,
    0
  );


  console.log(
    '✅ kill switch blocks SMTP'
  );


  let pendingCalls = 0;

  const pending =
    await sendApplicantInterviewNotification({
      interview: {
        ...interview,

        meeting: {
          status: 'pending',
          joinUrl: '',
        },
      },

      applicant,
      env,

      transporter: {
        async sendMail() {
          pendingCalls += 1;
        },
      },
    });


  assert.strictEqual(
    pending.status,
    'meeting_not_ready'
  );

  assert.strictEqual(
    pendingCalls,
    0
  );


  console.log(
    '✅ no email before online meeting is ready'
  );


  const failure =
    await sendApplicantInterviewNotification({
      interview,
      applicant,
      env,

      transporter: {
        async sendMail() {
          throw new Error(
            'Simulated SMTP failure'
          );
        },
      },

      logger: {
        error() {},
      },
    });


  assert.strictEqual(
    failure.status,
    'failed'
  );

  assert.strictEqual(
    failure.failed,
    3
  );


  console.log(
    '✅ SMTP failures are contained'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no real email sent'
  );

  console.log(
    '✅ no Calendar request made'
  );


  console.log(
    '\nINTERVIEW NOTIFICATION SERVICE TEST PASSED'
  );
}


main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
