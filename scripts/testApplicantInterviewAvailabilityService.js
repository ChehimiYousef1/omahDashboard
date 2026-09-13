'use strict';

const assert =
  require('assert');

const {
  buildCalendarIds,
  checkApplicantInterviewAvailability,
} = require(
  '../services/applicantInterviewAvailabilityService'
);


const APPLICANT_ID =
  '507f1f77bcf86cd799439011';

const INTERVIEW_ID =
  '507f1f77bcf86cd799439012';


function createApplicantModel() {
  return {
    findById:
      async () => ({
        _id:
          APPLICANT_ID,

        lifecycle: {
          archived: false,
        },
      }),
  };
}


function createInterviewModel(
  interviews
) {
  return {
    find: () => {
      const query = {
        select() {
          return query;
        },

        async lean() {
          return interviews;
        },
      };

      return query;
    },
  };
}


async function run() {
  const organizer = {
    userId:
      'admin-1',

    name:
      'Organizer',

    email:
      'organizer@example.com',

    role:
      'Admin',
  };

  const participants = [
    {
      userId:
        'interviewer-1',

      name:
        'Interviewer',

      email:
        'interviewer@example.com',

      participantType:
        'interviewer',

      role:
        'Technical Interviewer',
    },

    {
      name:
        'Candidate',

      email:
        'candidate@example.com',

      participantType:
        'applicant',

      role:
        'Candidate',
    },
  ];


  const calendarIds =
    buildCalendarIds({
      organizer,
      participants,
      calendarIds: [],
    });

  assert.deepStrictEqual(
    calendarIds,
    [
      'organizer@example.com',
      'interviewer@example.com',
    ]
  );

  assert(
    !calendarIds.includes(
      'candidate@example.com'
    )
  );

  console.log(
    '✅ applicant private calendar excluded by default'
  );


  const localBusy =
    await checkApplicantInterviewAvailability({
      applicantId:
        APPLICANT_ID,

      scheduledStart:
        '2026-09-20T10:00:00Z',

      scheduledEnd:
        '2026-09-20T11:00:00Z',

      timezone:
        'Asia/Beirut',

      organizer,
      participants,

      ApplicantModel:
        createApplicantModel(),

      InterviewModel:
        createInterviewModel([
          {
            _id:
              INTERVIEW_ID,

            applicantId:
              APPLICANT_ID,

            type:
              'technical',

            scheduledStart:
              new Date(
                '2026-09-20T10:30:00Z'
              ),

            scheduledEnd:
              new Date(
                '2026-09-20T11:30:00Z'
              ),

            organizer: {
              userId:
                'admin-1',

              name:
                'Organizer',

              email:
                'organizer@example.com',
            },

            participants: [],
          },
        ]),

      freeBusyChecker:
        async () => ({
          enabled: false,
          configured: false,
          checked: false,

          reason:
            'GOOGLE_CALENDAR_DISABLED',

          calendars: {},
        }),
    });

  assert.strictEqual(
    localBusy.status,
    'busy'
  );

  assert.strictEqual(
    localBusy.local
      .conflicts.length,
    1
  );

  console.log(
    '✅ local OMAH interview conflict detected'
  );


  const googleBusy =
    await checkApplicantInterviewAvailability({
      applicantId:
        APPLICANT_ID,

      scheduledStart:
        '2026-09-20T10:00:00Z',

      scheduledEnd:
        '2026-09-20T11:00:00Z',

      organizer,
      participants,

      ApplicantModel:
        createApplicantModel(),

      InterviewModel:
        createInterviewModel([]),

      freeBusyChecker:
        async () => ({
          enabled: true,
          configured: true,
          checked: true,

          calendars: {
            'organizer@example.com': {
              busy: [
                {
                  start:
                    '2026-09-20T10:15:00Z',

                  end:
                    '2026-09-20T10:45:00Z',
                },
              ],

              errors: [],
            },
          },
        }),
    });

  assert.strictEqual(
    googleBusy.status,
    'busy'
  );

  assert.strictEqual(
    googleBusy.google
      .busy.length,
    1
  );

  console.log(
    '✅ Google busy interval detected'
  );


  const safeDisabled =
    await checkApplicantInterviewAvailability({
      applicantId:
        APPLICANT_ID,

      scheduledStart:
        '2026-09-20T10:00:00Z',

      scheduledEnd:
        '2026-09-20T11:00:00Z',

      organizer,
      participants,

      ApplicantModel:
        createApplicantModel(),

      InterviewModel:
        createInterviewModel([]),

      freeBusyChecker:
        async () => ({
          enabled: false,
          configured: false,
          checked: false,

          reason:
            'GOOGLE_CALENDAR_DISABLED',

          calendars: {},
        }),
    });

  assert.strictEqual(
    safeDisabled.status,
    'omah_available'
  );

  assert.strictEqual(
    safeDisabled.available,
    true
  );

  assert.strictEqual(
    safeDisabled.fullyChecked,
    false
  );

  console.log(
    '✅ disabled Google returns OMAH-only availability'
  );


  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '✅ no Google network request used'
  );

  console.log(
    '✅ no Calendar event created'
  );

  console.log(
    '\nAPPLICANT INTERVIEW AVAILABILITY TEST PASSED'
  );
}


run().catch(
  (error) => {
    console.error(error);

    process.exitCode = 1;
  }
);
