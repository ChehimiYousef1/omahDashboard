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
    'TaskViewFilter',
    'TASK_VIEW_OPTIONS',
    'matchesTaskView',
    'isActionableInternalTask',
    'isInternalTaskOverdue',
    'isInternalTaskDueToday',
    'isInternalTaskUpcoming',
    'taskViewFilter',
    'taskMetrics',
    'visibleNotes',
    'All Items',
    'All Tasks',
    'My Tasks',
    'To Do',
    'In Progress',
    'Overdue',
    'Due Today',
    'Upcoming',
    'Completed',
    'Cancelled',
    'Urgent',
    'Unassigned',
    '7-day upcoming window',
    'No items match the selected task view.',
  ]
) {
  assert(
    panel.includes(
      token
    ),
    `Missing operational task token: ${token}`
  );
}


/*
 * Overdue must remain derived,
 * never a lifecycle status.
 */
const statusStart =
  panel.indexOf(
    'const TASK_STATUS_OPTIONS'
  );

const priorityStart =
  panel.indexOf(
    'const TASK_PRIORITY_OPTIONS',
    statusStart
  );

assert(
  statusStart >= 0 &&
  priorityStart >
    statusStart
);

const statusBlock =
  panel.slice(
    statusStart,
    priorityStart
  );

assert(
  !statusBlock.includes(
    'value:\n      "overdue"'
  )
);


/*
 * Open/actionable only = todo + in_progress.
 */
const actionableStart =
  panel.indexOf(
    'function isActionableInternalTask'
  );

const overdueStart =
  panel.indexOf(
    'function isInternalTaskOverdue',
    actionableStart
  );

assert(
  actionableStart >= 0 &&
  overdueStart >
    actionableStart
);

const actionableBlock =
  panel.slice(
    actionableStart,
    overdueStart
  );

assert(
  actionableBlock.includes(
    '"todo"'
  )
);

assert(
  actionableBlock.includes(
    '"in_progress"'
  )
);

assert(
  !actionableBlock.includes(
    '"completed"'
  )
);

assert(
  !actionableBlock.includes(
    '"cancelled"'
  )
);


/*
 * My Tasks = actual assignee, not author.
 */
const matchesStart =
  panel.indexOf(
    'function matchesTaskView'
  );

const propsStart =
  panel.indexOf(
    'interface Props',
    matchesStart
  );

assert(
  matchesStart >= 0 &&
  propsStart >
    matchesStart
);

const matchesBlock =
  panel.slice(
    matchesStart,
    propsStart
  );

assert(
  matchesBlock.includes(
    'note.assignee'
  )
);

assert(
  matchesBlock.includes(
    'currentUserId'
  )
);

assert(
  !matchesBlock.includes(
    'note.author'
  )
);


/*
 * Calendar actions remain explicit.
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


console.log(
  '✅ operational task filters'
);

console.log(
  '✅ open/actionable semantics'
);

console.log(
  '✅ overdue remains derived'
);

console.log(
  '✅ My Tasks uses real assignee'
);

console.log(
  '✅ operational KPI strip'
);

console.log(
  '✅ Calendar controls remain explicit'
);

console.log(
  '\nAPPLICANT TASK OPERATIONAL VIEWS TEST PASSED'
);
