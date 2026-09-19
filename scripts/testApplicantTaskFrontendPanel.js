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
    '"Recruiter"',
    '"Admin"',
    '"Super Admin"',
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
