'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const page =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantPipelineBoard.tsx',
    'utf8'
  );


for (
  const token of [
    'pipelineTaskStatusLabel',
    'pipelineTaskPriorityLabel',
    '"In Progress"',
    '"Completed"',
    '"Cancelled"',
    '"Urgent"',
    'note.assignee',
    'Assigned:',
    '"Unassigned"',
    'Quick Task',
  ]
) {
  assert(
    page.includes(
      token
    ),
    `Missing pipeline task compact-view token: ${token}`
  );
}


/*
 * Pipeline remains a compact/read-oriented surface.
 * Full task mutation controls belong in the Applicant profile.
 */
for (
  const forbidden of [
    'setApplicantInternalTaskAssignee',
    'setApplicantInternalTaskPriority',
    'setApplicantInternalTaskStatus',
    'Add to Calendar',
    'Update Calendar',
    'Remove from Calendar',
  ]
) {
  assert.strictEqual(
    page.includes(
      forbidden
    ),
    false,
    `Pipeline must not become full task-management surface: ${forbidden}`
  );
}


console.log(
  '✅ pipeline shows four-state task status'
);

console.log(
  '✅ pipeline shows priority'
);

console.log(
  '✅ pipeline shows actual assignee'
);

console.log(
  '✅ pipeline remains compact management preview'
);

console.log(
  '\nAPPLICANT PIPELINE TASK COMPACT VIEW TEST PASSED'
);
