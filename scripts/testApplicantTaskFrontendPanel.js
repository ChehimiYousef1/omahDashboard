'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const panel =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantInternalNotesTagsPanel.tsx',
    'utf8'
  );


for (
  const token of [
    'fetchUsers',
    'eligibleTaskAssignees',
    'applicantTaskAssigneeEnabled',
    'newAssigneeUserId',
    'newPriority',
    'changeTaskStatus',
    'changeTaskAssignee',
    'changeTaskPriority',
    'TASK_STATUS_OPTIONS',
    'TASK_PRIORITY_OPTIONS',
    'Assigned To',
    'Unassigned',
    'In Progress',
    'Completed',
    'Cancelled',
    'aria-label="Task status"',
    'aria-label="Task assignee"',
    'aria-label="Task priority"',
  ]
) {
  assert(
    panel.includes(token),
    `Missing Applicant task panel token: ${token}`
  );
}


/*
 * Task assignment is account-authorized, not role-authorized.
 *
 * A generic Recruiter/Admin/Super Admin role must never be enough
 * to enter the Applicant task assignee directory.
 */
assert.strictEqual(
  /"Recruiter"[\s\S]{0,140}"Admin"[\s\S]{0,140}"Super Admin"/.test(
    panel
  ),
  false,
  'Applicant task assignment must not use broad role eligibility'
);


/*
 * Calendar mutations must remain explicit actions.
 */
assert(
  panel.includes(
    'Add to Calendar'
  )
);

assert(
  panel.includes(
    'Update Calendar'
  )
);

assert(
  panel.includes(
    'Remove from Calendar'
  )
);


/*
 * No task metadata mutation should call a
 * Calendar function implicitly.
 */
const statusHandlerStart =
  panel.indexOf(
    'async function changeTaskStatus'
  );

const scheduleSection =
  panel.indexOf(
    '/*\n   * Schedule/reminder',
    statusHandlerStart
  );

assert(
  statusHandlerStart >= 0 &&
  scheduleSection >
    statusHandlerStart
);

const taskMutationBlock =
  panel.slice(
    statusHandlerStart,
    scheduleSection
  );

assert(
  !taskMutationBlock.includes(
    'addApplicantInternalNoteToCalendar'
  )
);

assert(
  !taskMutationBlock.includes(
    'updateApplicantInternalNoteCalendar'
  )
);

assert(
  !taskMutationBlock.includes(
    'removeApplicantInternalNoteFromCalendar'
  )
);


console.log(
  '✅ eligible OMAH assignee directory wired'
);

console.log(
  '✅ task create ownership / priority UI'
);

console.log(
  '✅ four-state task workflow UI'
);

console.log(
  '✅ card assignment / priority controls'
);

console.log(
  '✅ Calendar remains explicit-only'
);

console.log(
  '\nAPPLICANT TASK FRONTEND PANEL TEST PASSED'
);
