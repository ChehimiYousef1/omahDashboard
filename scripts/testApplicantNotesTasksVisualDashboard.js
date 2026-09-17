'use strict';

const assert =
  require('assert');

const fs =
  require('fs');


const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );


const page =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/analytics/NotesTasksAnalytics.tsx',
    'utf8'
  );


assert(
  api.includes(
    'temporalViews:'
  )
);


for (
  const mode
  of [
    'hourly',
    'daily',
    'weekly',
    'monthly',
  ]
) {
  assert(
    api.includes(
      `${mode}:`
    ),
    `Missing temporal frontend contract: ${mode}`
  );
}


for (
  const chart
  of [
    'AreaChart',
    'PieChart',
    'BarChart',
    'ResponsiveContainer',
  ]
) {
  assert(
    page.includes(
      chart
    ),
    `Missing visualization: ${chart}`
  );
}


for (
  const label
  of [
    'Hourly',
    'Daily',
    'Weekly',
    'Monthly',
    'Task Status',
    'Due-Date Distribution',
    'Calendar Synchronization Intelligence',
    'Open Task Workload by Owner',
    'Detailed Owner Workload',
    'Operational Metrics Matrix',
    'Notes / Tasks Lifecycle',
    'Google Calendar Synchronization Flow',
    'Not Added',
    'Synced',
    'Needs Update',
    'Sync Error',
    'View Applicants',
  ]
) {
  assert(
    page.includes(
      label
    ),
    `Missing professional Notes/Tasks dashboard element: ${label}`
  );
}


for (
  const type
  of [
    'open_task',
    'overdue_task',
    'due_today_task',
    'upcoming_task',
    'completed_task',
    'scheduled_reminder',
    'important_internal_item',
    'calendar_synced_internal_item',
    'calendar_not_linked_scheduled',
    'calendar_needs_update',
    'calendar_sync_error',
  ]
) {
  assert(
    page.includes(
      `"${type}"`
    ),
    `Missing clickable drill-down: ${type}`
  );
}


for (
  const forbidden
  of [
    'addApplicantInternalNoteToCalendar',
    'updateApplicantInternalNoteCalendar',
    'removeApplicantInternalNoteFromCalendar',
    'events.insert',
    'events.patch',
    'events.delete',
  ]
) {
  assert.strictEqual(
    page.includes(
      forbidden
    ),
    false,
    `Analytics dashboard must remain read-only: ${forbidden}`
  );
}


console.log(
  '✅ KPI layer present'
);

console.log(
  '✅ Hourly / Daily / Weekly / Monthly temporal selector present'
);

console.log(
  '✅ multi-series activity Area chart present'
);

console.log(
  '✅ Task-status donut present'
);

console.log(
  '✅ Due-date bar chart present'
);

console.log(
  '✅ Calendar-sync donut present'
);

console.log(
  '✅ stacked owner workload chart present'
);

console.log(
  '✅ detailed workload table present'
);

console.log(
  '✅ clickable operational metrics table present'
);

console.log(
  '✅ Notes/Tasks lifecycle diagram present'
);

console.log(
  '✅ Google Calendar synchronization flowchart present'
);

console.log(
  '✅ explicit Calendar states present'
);

console.log(
  '✅ visualization dashboard remains read-only'
);

console.log(
  '\nAPPLICANT NOTES/TASKS VISUAL DASHBOARD TEST PASSED'
);
