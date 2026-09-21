'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const mongoose =
  require('mongoose');

const {
  buildInterviewAuditChanges,
  updateApplicantInterview,
} = require(
  '../services/applicantInterviewService'
);


const previous = {
  type:
    'technical',

  scheduledStart:
    new Date(
      '2026-09-21T10:00:00Z'
    ),

  scheduledEnd:
    new Date(
      '2026-09-21T11:00:00Z'
    ),

  timezone:
    'Asia/Beirut',

  format:
    'online',

  meeting: {
    provider:
      'google_meet',
  },

  location:
    '',

  notes:
    'Private old note',

  participants: [
    {
      userId:
        'admin-1',

      name:
        'Admin User',

      email:
        'ADMIN@EXAMPLE.COM',

      participantType:
        'interviewer',

      role:
        'Admin',
    },
  ],
};


const next = {
  ...previous,

  scheduledStart:
    new Date(
      '2026-09-21T12:00:00Z'
    ),

  scheduledEnd:
    new Date(
      '2026-09-21T13:00:00Z'
    ),

  timezone:
    'Europe/Berlin',

  location:
    'Room 4',

  notes:
    'Different private note',

  participants: [
    {
      userId:
        'admin-1',

      name:
        'Admin User',

      email:
        'admin@example.com',

      participantType:
        'interviewer',

      role:
        'Lead Interviewer',
    },
  ],
};


const changes =
  buildInterviewAuditChanges({
    previous,
    next,
  });


const fields =
  changes.map(
    change =>
      change.field
  );


assert.deepStrictEqual(
  fields,
  [
    'interview.scheduledStart',
    'interview.scheduledEnd',
    'interview.timezone',
    'interview.location',
    'interview.participants',
  ]
);


assert.strictEqual(
  fields.includes(
    'interview.notes'
  ),
  false
);

assert.strictEqual(
  fields.includes(
    'interview.meetingLink'
  ),
  false
);

assert.strictEqual(
  fields.includes(
    'interview.providerEventId'
  ),
  false
);


console.log(
  '✅ changed Interview fields detected'
);

console.log(
  '✅ unchanged Interview fields excluded'
);

console.log(
  '✅ notes/provider internals excluded'
);


/*
|--------------------------------------------------------------------------
| Participant ordering normalization
|--------------------------------------------------------------------------
*/

const reordered =
  buildInterviewAuditChanges({
    previous: {
      ...previous,

      participants: [
        {
          userId:
            '2',

          name:
            'Beta',

          email:
            'beta@example.com',

          participantType:
            'guest',

          role:
            '',
        },

        {
          userId:
            '1',

          name:
            'Alpha',

          email:
            'alpha@example.com',

          participantType:
            'interviewer',

          role:
            'Recruiter',
        },
      ],
    },

    next: {
      ...previous,

      participants: [
        {
          userId:
            '1',

          name:
            'Alpha',

          email:
            'ALPHA@example.com',

          participantType:
            'interviewer',

          role:
            'Recruiter',
        },

        {
          userId:
            '2',

          name:
            'Beta',

          email:
            'beta@example.com',

          participantType:
            'guest',

          role:
            '',
        },
      ],
    },
  });


assert.strictEqual(
  reordered.some(
    change =>
      change.field ===
      'interview.participants'
  ),
  false
);


console.log(
  '✅ participant comparison normalized + order-safe'
);


/*
|--------------------------------------------------------------------------
| Runtime optional return contract
|--------------------------------------------------------------------------
*/

async function runtimeTest() {
  const applicantId =
    new mongoose.Types.ObjectId();

  const interviewId =
    new mongoose.Types.ObjectId();

  const existing = {
    _id:
      interviewId,

    applicantId,

    status:
      'scheduled',

    archived:
      false,

    type:
      'technical',

    scheduledStart:
      new Date(
        '2026-09-21T10:00:00Z'
      ),

    scheduledEnd:
      new Date(
        '2026-09-21T11:00:00Z'
      ),

    timezone:
      'Asia/Beirut',

    format:
      'online',

    meeting: {
      provider:
        'google_meet',

      status:
        'pending',

      providerEventId:
        '',
    },

    meetingLink:
      '',

    location:
      'Old room',

    notes:
      'Existing note',

    participants: [
      {
        userId:
          'admin-1',

        name:
          'Admin User',

        email:
          'admin@example.com',

        participantType:
          'interviewer',

        role:
          'Admin',
      },
    ],
  };


  const ApplicantModel = {
    async findById() {
      return {
        _id:
          applicantId,

        archived:
          false,
      };
    },
  };


  const InterviewModel = {
    async findOne() {
      return existing;
    },

    async findOneAndUpdate(
      filter,
      update
    ) {
      return {
        ...existing,
        ...update.$set,
      };
    },
  };


  const result =
    await updateApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      interviewId:
        String(
          interviewId
        ),

      location:
        'New room',

      participants: [
        {
          userId:
            'admin-1',

          name:
            'Admin User',

          email:
            'admin@example.com',

          participantType:
            'interviewer',

          role:
            'Lead Interviewer',
        },
      ],

      includeAuditResult:
        true,

      ApplicantModel,

      InterviewModel,

      syncInterviewMeeting:
        async ({
          interview,
        }) =>
          interview,

      notifyInterview:
        async () => ({
          status:
            'not-needed',
        }),
    });


  assert(
    result &&
    typeof result ===
      'object'
  );

  assert.strictEqual(
    result.interview.location,
    'New room'
  );

  assert(
    Array.isArray(
      result.auditChanges
    )
  );

  assert(
    result.auditChanges.some(
      change =>
        change.field ===
        'interview.location'
    )
  );

  assert(
    result.auditChanges.some(
      change =>
        change.field ===
        'interview.participants'
    )
  );

  assert.strictEqual(
    result.auditMetadata
      .notesChanged,
    false
  );


  console.log(
    '✅ optional audit-result contract works'
  );
}


/*
|--------------------------------------------------------------------------
| Route contract
|--------------------------------------------------------------------------
*/

function routeTest() {
  const source =
    fs.readFileSync(
      'src/routes/applicants.routes.js',
      'utf8'
    );

  const start =
    source.indexOf(
      "  router.patch(\n    '/:id/interviews/:interviewId',"
    );

  const end =
    source.indexOf(
      "  router.post(\n    '/:id/interviews/:interviewId/complete',",
      start
    );

  assert(
    start >= 0 &&
    end > start
  );

  const block =
    source.slice(
      start,
      end
    );

  assert(
    block.includes(
      'includeAuditResult:'
    )
  );

  assert(
    block.includes(
      "'interview.updated'"
    )
  );

  assert(
    block.includes(
      'structuredInterviewChanges'
    )
  );

  assert(
    block.includes(
      'notesChanged'
    )
  );

  assert.strictEqual(
    block.includes(
      "'interview.notes'"
    ),
    false
  );

  assert.strictEqual(
    block.includes(
      "'interview.meetingLink'"
    ),
    false
  );

  assert.strictEqual(
    block.includes(
      "'interview.providerEventId'"
    ),
    false
  );


  console.log(
    '✅ update route consumes audit result'
  );

  console.log(
    '✅ notes-only edit tracked without note content'
  );
}


(async () => {
  await runtimeTest();
  routeTest();

  console.log(
    '\nAPPLICANT AUDIT B3A2 TEST PASSED'
  );
})().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
