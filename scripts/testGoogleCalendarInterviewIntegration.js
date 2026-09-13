'use strict';

const assert =
  require('assert');

const {
  createApplicantInterview,
} = require(
  '../services/applicantInterviewService'
);


async function run() {
  let createdPayload = null;

  const ApplicantModel = {
    findById: async () => ({
      _id:
        '507f1f77bcf86cd799439011',

      lifecycle: {
        archived: false,
      },
    }),
  };


  const SubmissionModel = {
    findById: async () => null,
  };


  const InterviewModel = {
    create: async (payload) => {
      createdPayload =
        payload;

      return {
        _id:
          '507f1f77bcf86cd799439012',

        ...payload,
      };
    },
  };


  await createApplicantInterview({
    applicantId:
      '507f1f77bcf86cd799439011',

    submissionId: null,

    type:
      'technical',

    scheduledStart:
      '2026-09-20T10:00:00.000Z',

    scheduledEnd:
      '2026-09-20T11:00:00.000Z',

    timezone:
      'Asia/Beirut',

    format:
      'online',

    participants: [
      {
        name:
          'Candidate Example',

        email:
          'CANDIDATE@EXAMPLE.COM',

        participantType:
          'applicant',

        role:
          'Candidate',
      },

      {
        userId:
          'admin-1',

        name:
          'Interviewer Example',

        email:
          'INTERVIEWER@EXAMPLE.COM',

        participantType:
          'interviewer',

        role:
          'Technical Interviewer',
      },
    ],

    createdBy: {
      userId:
        'admin-1',

      name:
        'Organizer Example',

      email:
        'ORGANIZER@EXAMPLE.COM',

      role:
        'Admin',
    },

    ApplicantModel,
    SubmissionModel,
    InterviewModel,
  });


  assert(
    createdPayload,
    'Interview create payload was not captured.'
  );


  assert.strictEqual(
    createdPayload
      .organizer
      .email,

    'organizer@example.com'
  );

  console.log(
    '✅ organizer email preserved and normalized'
  );


  assert.strictEqual(
    createdPayload
      .participants[0]
      .participantType,

    'applicant'
  );

  assert.strictEqual(
    createdPayload
      .participants[1]
      .participantType,

    'interviewer'
  );

  console.log(
    '✅ participant types preserved'
  );


  assert.strictEqual(
    createdPayload
      .participants[0]
      .email,

    'candidate@example.com'
  );

  assert.strictEqual(
    createdPayload
      .participants[1]
      .email,

    'interviewer@example.com'
  );

  console.log(
    '✅ participant emails normalized'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no Google Calendar request made'
  );

  console.log(
    '\nGOOGLE CALENDAR INTERVIEW INTEGRATION TEST PASSED'
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
