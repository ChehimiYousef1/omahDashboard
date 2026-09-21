'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const {
  buildApplicantActivity,
} = require(
  '../services/applicantActivityService'
);


const source =
  fs.readFileSync(
    'src/routes/applicants.routes.js',
    'utf8'
  );


function routeSection(
  startMarker,
  endMarker
) {
  const start =
    source.indexOf(
      startMarker
    );

  assert(
    start >= 0,
    `Missing route ${startMarker}`
  );

  const end =
    source.indexOf(
      endMarker,
      start +
        startMarker.length
    );

  assert(
    end >= 0,
    `Missing route boundary ${endMarker}`
  );

  return source.slice(
    start,
    end
  );
}


function verifyChange({
  section,
  field,
  label,
  before,
  after,
}) {
  assert(
    section.includes(
      `'${field}'`
    ),
    `${field} field missing`
  );

  assert(
    section.includes(
      `'${label}'`
    ),
    `${field} label missing`
  );

  assert(
    section.includes(before),
    `${field} before value missing`
  );

  assert(
    section.includes(after),
    `${field} after value missing`
  );
}


verifyChange({
  section:
    routeSection(
      "'/:id/tags'",
      "'/:id/audit'"
    ),

  field:
    'recruitment.tags',

  label:
    'Applicant tags',

  before:
    'result.previousTags',

  after:
    'result.tags',
});


verifyChange({
  section:
    routeSection(
      "'/:id/status'",
      "'/:id/archive'"
    ),

  field:
    'recruitment.status',

  label:
    'Recruitment status',

  before:
    'result.previousStatus',

  after:
    'result.currentStatus',
});


verifyChange({
  section:
    routeSection(
      "'/:id/notes/:noteId/task-assignee'",
      "'/:id/notes/:noteId/task-priority'"
    ),

  field:
    'task.assignee',

  label:
    'Task assignee',

  before:
    'result.previousAssignee',

  after:
    'result.assignee',
});


verifyChange({
  section:
    routeSection(
      "'/:id/notes/:noteId/task-priority'",
      "'/:id/notes/:noteId/task-status'"
    ),

  field:
    'task.priority',

  label:
    'Task priority',

  before:
    'result.previousPriority',

  after:
    'result.priority',
});


verifyChange({
  section:
    routeSection(
      "'/:id/notes/:noteId/task-status'",
      "'/:id/notes/:noteId/schedule'"
    ),

  field:
    'task.status',

  label:
    'Task status',

  before:
    'result.previousTaskStatus',

  after:
    'result.taskStatus',
});


/*
|--------------------------------------------------------------------------
| Writer sanitization still works
|--------------------------------------------------------------------------
*/

const event =
  buildApplicantActivity({
    applicantId:
      '507f1f77bcf86cd799439011',

    type:
      'status.changed',

    title:
      'Recruitment status changed',

    changes: [
      {
        field:
          'recruitment.status',

        label:
          'Recruitment status',

        before:
          'reviewing',

        after:
          'shortlisted',
      },

      {
        field:
          'passwordHash',

        before:
          'secret',

        after:
          'other-secret',
      },
    ],
  });


assert.strictEqual(
  event.changes.length,
  1
);

assert.strictEqual(
  event.changes[0].field,
  'recruitment.status'
);


/*
|--------------------------------------------------------------------------
| Swagger stays grouped
|--------------------------------------------------------------------------
*/

const swagger =
  require(
    '../docs/applicantSwagger'
  );


assert.deepStrictEqual(
  swagger.paths[
    '/api/applicants/{id}/audit'
  ].get.tags,
  [
    'Applicant Audit & History'
  ]
);


console.log(
  '✅ Applicant tags before → after'
);

console.log(
  '✅ recruitment status before → after'
);

console.log(
  '✅ task assignee before → after'
);

console.log(
  '✅ task priority before → after'
);

console.log(
  '✅ task status before → after'
);

console.log(
  '✅ sensitive fields still filtered'
);

console.log(
  '✅ Swagger audit grouping preserved'
);

console.log(
  '\nAPPLICANT AUDIT PASS B1 TEST PASSED'
);
