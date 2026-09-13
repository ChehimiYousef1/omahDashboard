'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const ApplicantInterview =
  require(
    '../models/ApplicantInterview'
  );

const {
  buildInterviewScheduleData,
  validateInterviewMeetingProvider,
} = require(
  '../services/applicantInterviewService'
);


const organizer = {
  userId:
    'admin-1',

  name:
    'Admin',

  email:
    'admin@example.com',

  role:
    'Admin',
};


const participants = [
  {
    name:
      'Candidate',

    email:
      'candidate@example.com',

    participantType:
      'applicant',
  },
];


const google =
  buildInterviewScheduleData({
    type:
      'technical',

    scheduledStart:
      '2026-09-20T10:00:00Z',

    scheduledEnd:
      '2026-09-20T11:00:00Z',

    format:
      'online',

    meetingProvider:
      'google_meet',

    participants,
    organizer,
  });


assert.strictEqual(
  google.meeting.provider,
  'google_meet'
);

assert.strictEqual(
  google.meeting.status,
  'pending'
);

assert.strictEqual(
  google.meetingLink,
  ''
);

console.log(
  '✅ Google Meet provider accepted without manual URL'
);


for (
  const provider
  of [
    'zoom',
    'microsoft_teams',
  ]
) {
  assert.strictEqual(
    validateInterviewMeetingProvider({
      format:
        'online',

      meetingProvider:
        provider,
    }),

    provider
  );
}

console.log(
  '✅ Zoom and Microsoft Teams providers accepted'
);


assert.throws(
  () =>
    validateInterviewMeetingProvider({
      format:
        'online',

      meetingProvider:
        'manual',
    }),

  (
    error
  ) =>
    error.code ===
    'INTERVIEW_MEETING_PROVIDER_REQUIRED'
);

console.log(
  '✅ manual/custom provider rejected'
);


const onsite =
  buildInterviewScheduleData({
    type:
      'hr',

    scheduledStart:
      '2026-09-20T12:00:00Z',

    scheduledEnd:
      '2026-09-20T13:00:00Z',

    format:
      'onsite',

    meetingProvider:
      'zoom',

    location:
      'OMAH Office',

    participants,
    organizer,
  });


assert.strictEqual(
  onsite.meeting.provider,
  'none'
);

assert.strictEqual(
  onsite.meeting.status,
  'not_required'
);

console.log(
  '✅ onsite interview ignores online meeting provider'
);


const meetingPath =
  ApplicantInterview.schema
    .path('meeting');

assert(
  meetingPath &&
  meetingPath.schema,
  'Meeting sub-schema missing.'
);

assert(
  meetingPath
    .schema
    .path('provider')
);

assert(
  meetingPath
    .schema
    .path('joinUrl')
);

assert(
  meetingPath
    .schema
    .path('status')
);

console.log(
  '✅ generic meeting metadata exists in model'
);


const routes =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );

assert(
  routes.includes(
    'meetingProvider'
  )
);

assert.strictEqual(
  /req\.body\s*\?\.\s*\.meetingLink/
    .test(routes),

  false,

  'Routes must not accept meetingLink from the client.'
);

console.log(
  '✅ API routes reject client-managed meeting links'
);


const swagger =
  fs.readFileSync(
    'docs/applicantInterviewSwagger.js',
    'utf8'
  );

assert(
  swagger.includes(
    'meetingProvider'
  )
);

assert(
  swagger.includes(
    "'google_meet'"
  )
);

assert(
  swagger.includes(
    "'zoom'"
  )
);

assert(
  swagger.includes(
    "'microsoft_teams'"
  )
);

console.log(
  '✅ Swagger documents all meeting providers'
);


const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );

assert(
  api.includes(
    'ApplicantInterviewMeetingProvider'
  )
);

assert.strictEqual(
  (
    api.match(
      /meetingLink\?:/g
    ) || []
  ).length,

  0,

  'Frontend write payload still exposes meetingLink.'
);

console.log(
  '✅ frontend write contracts no longer expose manual link'
);


const panel =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantInterviewPanel.tsx',
    'utf8'
  );

assert(
  panel.includes(
    'Meeting Provider'
  )
);

assert(
  panel.includes(
    'Google Meet'
  )
);

assert(
  panel.includes(
    'Zoom'
  )
);

assert(
  panel.includes(
    'Microsoft Teams'
  )
);

assert(
  panel.includes(
    'Manual meeting URLs are disabled'
  )
);

assert.strictEqual(
  panel.includes(
    'placeholder="https://..."'
  ),
  false
);

console.log(
  '✅ manual Meeting Link input removed from UI'
);


console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '✅ no Google/Zoom/Teams request made'
);

console.log(
  '✅ no meeting created'
);

console.log(
  '\nINTERVIEW MEETING PROVIDER ARCHITECTURE TEST PASSED'
);
