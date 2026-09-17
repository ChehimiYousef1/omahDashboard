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

const dashboard =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantAnalyticsDashboard.tsx',
    'utf8'
  );

const component =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/analytics/NotesTasksAnalytics.tsx',
    'utf8'
  );

const overview =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/analytics/AnalyticsOverview.tsx',
    'utf8'
  );

const management =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/analytics/ManagementAnalytics.tsx',
    'utf8'
  );


assert(
  api.includes(
    'export interface ApplicantNotesTasksAnalytics'
  )
);

assert(
  api.includes(
    'notesTasks:\n    ApplicantNotesTasksAnalytics'
  )
);

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
    api.includes(
      `"${type}"`
    ),
    `frontend drill-down type missing: ${type}`
  );
}


assert(
  dashboard.includes(
    '"notesTasks"'
  )
);

assert(
  dashboard.includes(
    'label:\n        "Notes & Tasks"'
  )
);

assert(
  dashboard.includes(
    '<NotesTasksAnalytics'
  )
);


for (
  const label
  of [
    'Open Tasks',
    'Overdue',
    'Due Today',
    'Upcoming',
    'Completed',
    'Completion Rate',
    'Reminders',
    'Important',
    'Calendar Synced',
    'Not Added',
    'Needs Update',
    'Sync Error',
    'Open Task Workload by Owner',
    'Task Status',
    'Due-Date Distribution',
  ]
) {
  assert(
    component.includes(
      label
    ),
    `Notes/Tasks analytics UI missing: ${label}`
  );
}


assert(
  component.includes(
    'ownerSource'
  ) ||
  component.includes(
    'author'
  )
);


assert(
  overview.includes(
    '"overdue_task"'
  )
);

assert(
  overview.includes(
    '"calendar_sync_error"'
  )
);

assert(
  management.includes(
    '"overdue_task"'
  )
);

assert(
  management.includes(
    '"calendar_sync_error"'
  )
);


console.log(
  '✅ Notes & Tasks analytics TypeScript contract connected'
);

console.log(
  '✅ Notes & Tasks Applicant Analytics tab connected'
);

console.log(
  '✅ task/reminder/importance/Calendar metrics connected'
);

console.log(
  '✅ owner workload and distributions connected'
);

console.log(
  '✅ Overview Action Center operational task alerts connected'
);

console.log(
  '✅ Management Action Center operational task alerts connected'
);

console.log(
  '\nAPPLICANT NOTES & TASKS ANALYTICS FRONTEND TEST PASSED'
);
