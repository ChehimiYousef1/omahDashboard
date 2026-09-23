'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');


const notesService =
  require(
    '../services/applicantInternalNotesService'
  );

const calendarSyncService =
  require(
    '../services/applicantInternalCalendarSyncService'
  );

const googleCalendarService =
  require(
    '../services/googleCalendarService'
  );


/*
|--------------------------------------------------------------------------
| 1. EXISTING APPLICANT TASK SYSTEM REMAINS SOURCE OF TRUTH
|--------------------------------------------------------------------------
*/


assert.strictEqual(
  typeof notesService
    .createApplicantInternalNote,
  'function',
  'Existing Applicant Notes/Tasks creation service must remain available'
);


assert.strictEqual(
  typeof notesService
    .updateApplicantInternalNote,
  'function',
  'Existing Applicant Notes/Tasks update service must remain available'
);


assert.strictEqual(
  typeof notesService
    .setApplicantInternalTaskStatus,
  'function',
  'Existing Applicant Task status workflow must remain available'
);


assert.strictEqual(
  typeof notesService
    .setApplicantInternalTaskPriority,
  'function',
  'Existing Applicant Task priority workflow must remain available'
);


assert.strictEqual(
  typeof notesService
    .setApplicantInternalTaskAssignee,
  'function',
  'Existing Applicant Task assignee workflow must remain available'
);


console.log(
  '✅ existing Applicant Tasks remain reusable'
);


/*
|--------------------------------------------------------------------------
| 2. EXISTING EXPLICIT CALENDAR SYNC REMAINS SOURCE OF TRUTH
|--------------------------------------------------------------------------
*/


assert.strictEqual(
  typeof calendarSyncService
    .addApplicantInternalItemToCalendar,
  'function',
  'Explicit Applicant Calendar create action must remain available'
);


assert.strictEqual(
  typeof calendarSyncService
    .updateApplicantInternalItemCalendar,
  'function',
  'Explicit Applicant Calendar update action must remain available'
);


assert.strictEqual(
  typeof calendarSyncService
    .removeApplicantInternalItemFromCalendar,
  'function',
  'Explicit Applicant Calendar delete action must remain available'
);


assert.strictEqual(
  typeof googleCalendarService
    .assertCalendarWriteEnabled,
  'function',
  'Google Calendar write safety gate must remain available'
);


console.log(
  '✅ existing explicit Calendar synchronization remains reusable'
);


/*
|--------------------------------------------------------------------------
| 3. TALENT POOL MUST NOT CREATE A SECOND TASK SYSTEM
|--------------------------------------------------------------------------
*/


const root =
  path.resolve(
    __dirname,
    '..'
  );


const duplicateTaskFiles = [
  'models/TalentPoolTask.js',
  'models/ApplicantTalentPoolTask.js',
  'services/applicantTalentPoolTaskService.js',
  'services/talentPoolTaskService.js',
];


for (
  const relativePath
  of duplicateTaskFiles
) {
  assert.strictEqual(
    fs.existsSync(
      path.join(
        root,
        relativePath
      )
    ),
    false,
    `Talent Pool must not introduce duplicate task subsystem: ${relativePath}`
  );
}


console.log(
  '✅ no duplicate Talent Pool Task model/service introduced'
);


/*
|--------------------------------------------------------------------------
| 4. TALENT POOL REVIEW SERVICE HAS NO TASK/CALENDAR DEPENDENCY
|--------------------------------------------------------------------------
*/


const talentPoolServiceSource =
  fs.readFileSync(
    path.join(
      root,
      'services/applicantTalentPoolService.js'
    ),
    'utf8'
  );


const talentPoolRouterSource =
  fs.readFileSync(
    path.join(
      root,
      'src/routes/applicantTalentPool.routes.js'
    ),
    'utf8'
  );


const forbiddenDependencies = [
  'applicantInternalNotesService',
  'applicantInternalCalendarSyncService',
  'applicantInternalCalendarProvider',
  'googleCalendarService',
];


for (
  const dependency
  of forbiddenDependencies
) {
  assert.strictEqual(
    talentPoolServiceSource.includes(
      dependency
    ),
    false,
    `Talent Pool service must not depend on ${dependency}`
  );

  assert.strictEqual(
    talentPoolRouterSource.includes(
      dependency
    ),
    false,
    `Talent Pool router must not depend on ${dependency}`
  );
}


const forbiddenCalls = [
  'createApplicantInternalNote(',
  'addApplicantInternalItemToCalendar(',
  'updateApplicantInternalItemCalendar(',
  'removeApplicantInternalItemFromCalendar(',
  'createApplicantInternalCalendarEvent(',
  'updateApplicantInternalCalendarEvent(',
  'deleteApplicantInternalCalendarEvent(',
];


for (
  const call
  of forbiddenCalls
) {
  assert.strictEqual(
    talentPoolServiceSource.includes(
      call
    ),
    false,
    `Talent Pool service must not invoke ${call}`
  );

  assert.strictEqual(
    talentPoolRouterSource.includes(
      call
    ),
    false,
    `Talent Pool router must not invoke ${call}`
  );
}


console.log(
  '✅ Talent Pool review performs no Task/Calendar side effect'
);


/*
|--------------------------------------------------------------------------
| 5. EXISTING TASK HTTP WORKFLOW MUST REMAIN AVAILABLE
|--------------------------------------------------------------------------
*/


const applicantRoutesSource =
  fs.readFileSync(
    path.join(
      root,
      'src/routes/applicants.routes.js'
    ),
    'utf8'
  );


assert.ok(
  applicantRoutesSource.includes(
    'createApplicantInternalNote'
  ),
  'Applicant route layer must continue using existing Notes/Tasks service'
);


assert.ok(
  applicantRoutesSource.includes(
    'setApplicantInternalTaskAssignee'
  ),
  'Applicant Task assignee route must remain integrated'
);


assert.ok(
  applicantRoutesSource.includes(
    'setApplicantInternalTaskPriority'
  ),
  'Applicant Task priority route must remain integrated'
);


assert.ok(
  applicantRoutesSource.includes(
    'setApplicantInternalTaskStatus'
  ),
  'Applicant Task status route must remain integrated'
);


console.log(
  '✅ existing Applicant Task HTTP workflow preserved'
);


/*
|--------------------------------------------------------------------------
| 6. CALENDAR WRITES MUST REMAIN EXPLICIT HTTP ACTIONS
|--------------------------------------------------------------------------
*/


const calendarPath =
  '/:id/notes/:noteId/calendar';


function explicitCalendarRouteExists(
  method
) {
  const expression =
    new RegExp(
      `router\\.${method}\\(\\s*['"]${calendarPath.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )}['"]`
    );

  return expression.test(
    applicantRoutesSource
  );
}


assert.strictEqual(
  explicitCalendarRouteExists(
    'post'
  ),
  true,
  'Explicit POST Task/Note → Calendar route must remain available'
);


assert.strictEqual(
  explicitCalendarRouteExists(
    'patch'
  ),
  true,
  'Explicit PATCH Calendar synchronization route must remain available'
);


assert.strictEqual(
  explicitCalendarRouteExists(
    'delete'
  ),
  true,
  'Explicit DELETE Calendar synchronization route must remain available'
);


console.log(
  '✅ POST/PATCH/DELETE Calendar synchronization remains explicit'
);


/*
|--------------------------------------------------------------------------
| 7. REVIEW ROUTES MUST BE SEPARATE FROM CALENDAR ROUTES
|--------------------------------------------------------------------------
*/


assert.ok(
  talentPoolRouterSource.includes(
    "'/:applicantId/review'"
  ),
  'Talent Pool review route missing'
);


assert.ok(
  talentPoolRouterSource.includes(
    "'/:applicantId/review/schedule'"
  ),
  'Talent Pool review scheduling route missing'
);


assert.strictEqual(
  talentPoolRouterSource.includes(
    calendarPath
  ),
  false,
  'Talent Pool router must not duplicate Applicant Calendar routes'
);


console.log(
  '✅ Talent Pool review routes remain separate from Calendar routes'
);


/*
|--------------------------------------------------------------------------
| 8. SWAGGER MUST EXPLAIN THE SEPARATION
|--------------------------------------------------------------------------
*/


const talentPoolSwagger =
  require(
    '../docs/applicantTalentPoolSwagger'
  );


for (
  const swaggerPath
  of [
    '/api/applicants/talent-pool/{applicantId}/review',
    '/api/applicants/talent-pool/{applicantId}/review/schedule',
  ]
) {
  const operation =
    talentPoolSwagger
      ?.paths
      ?.[swaggerPath]
      ?.post;

  assert.ok(
    operation,
    `Missing Talent Pool Swagger operation: ${swaggerPath}`
  );

  const description =
    String(
      operation.description ||
      ''
    );

  assert.ok(
    description.includes(
      'does not create an Applicant Task'
    ),
    `${swaggerPath} must document Task separation`
  );

  assert.ok(
    description.includes(
      'does not create or update a Google Calendar event'
    ),
    `${swaggerPath} must document Calendar separation`
  );
}


console.log(
  '✅ Swagger documents Task/Calendar separation'
);


/*
|--------------------------------------------------------------------------
| 9. CALENDAR WRITE GATE MUST STILL EXIST
|--------------------------------------------------------------------------
*/


const googleCalendarSource =
  fs.readFileSync(
    path.join(
      root,
      'services/googleCalendarService.js'
    ),
    'utf8'
  );


assert.ok(
  googleCalendarSource.includes(
    'GOOGLE_CALENDAR_WRITE_ENABLED'
  ),
  'Google Calendar write feature flag must remain enforced'
);


assert.ok(
  googleCalendarSource.includes(
    'GOOGLE_CALENDAR_WRITE_DISABLED'
  ),
  'Google Calendar write-disabled error must remain enforced'
);


console.log(
  '✅ Google Calendar write safety gate preserved'
);


console.log(
  '\nAPPLICANT TALENT POOL TASK/CALENDAR REUSE CONTRACT TEST PASSED'
);
