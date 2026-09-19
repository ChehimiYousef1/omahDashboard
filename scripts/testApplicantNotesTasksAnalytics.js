'use strict';

const assert =
  require('assert');

const {
  buildApplicantNotesTasksAnalytics,
  dayBounds,
  internalItemMatchesDrilldown,
} = require(
  '../services/analytics/applicantNotesTasksAnalytics'
);


const now =
  new Date(
    '2026-09-17T12:00:00.000Z'
  );

const {
  start,
  end,
} =
  dayBounds(
    now
  );


function offset(
  base,
  milliseconds
) {
  return new Date(
    base.getTime() +
    milliseconds
  );
}


const HOUR =
  60 * 60 * 1000;

const DAY =
  24 * HOUR;


const items = [
  {
    _id:
      'overdue',

    applicantId:
      'a1',

    kind:
      'task',

    taskStatus:
      'todo',

    author: {
      userId:
        'u1',

      name:
        'Owner One',
    },

    schedule: {
      endAt:
        offset(
          start,
          -DAY
        ),

      reminderAt:
        offset(
          start,
          -DAY - HOUR
        ),
    },

    calendar: {
      syncStatus:
        'not_synced',
    },

    archived:
      false,
  },

  {
    _id:
      'today',

    applicantId:
      'a1',

    kind:
      'task',

    taskStatus:
      'todo',

    important:
      true,

    author: {
      userId:
        'u1',

      name:
        'Owner One',
    },

    schedule: {
      startAt:
        offset(
          start,
          HOUR
        ),

      endAt:
        offset(
          start,
          2 * HOUR
        ),
    },

    calendar: {
      syncStatus:
        'not_synced',
    },

    archived:
      false,
  },

  {
    _id:
      'upcoming',

    applicantId:
      'a2',

    kind:
      'task',

    taskStatus:
      'todo',

    author: {
      userId:
        'u2',

      name:
        'Owner Two',
    },

    schedule: {
      startAt:
        offset(
          end,
          DAY
        ),

      endAt:
        offset(
          end,
          DAY + HOUR
        ),
    },

    calendar: {
      eventId:
        'event-upcoming',

      syncStatus:
        'not_synced',
    },

    archived:
      false,
  },

  {
    _id:
      'completed',

    applicantId:
      'a2',

    kind:
      'task',

    taskStatus:
      'completed',

    completedAt:
      now,

    author: {
      userId:
        'u2',

      name:
        'Owner Two',
    },

    schedule: {},

    calendar: {
      syncStatus:
        'not_synced',
    },

    archived:
      false,
  },

  {
    _id:
      'note',

    applicantId:
      'a2',

    kind:
      'note',

    important:
      true,

    author: {
      userId:
        'u2',

      name:
        'Owner Two',
    },

    schedule: {
      startAt:
        offset(
          end,
          2 * DAY
        ),

      endAt:
        offset(
          end,
          2 * DAY + HOUR
        ),

      reminderAt:
        offset(
          end,
          DAY
        ),
    },

    calendar: {
      syncStatus:
        'not_synced',
    },

    archived:
      false,
  },

  {
    _id:
      'synced',

    applicantId:
      'a1',

    kind:
      'note',

    author: {
      userId:
        'u1',

      name:
        'Owner One',
    },

    schedule: {
      startAt:
        offset(
          end,
          3 * DAY
        ),

      endAt:
        offset(
          end,
          3 * DAY + HOUR
        ),
    },

    calendar: {
      eventId:
        'event-synced',

      syncStatus:
        'synced',
    },

    archived:
      false,
  },

  {
    _id:
      'error',

    applicantId:
      'a1',

    kind:
      'note',

    author: {
      userId:
        'u1',

      name:
        'Owner One',
    },

    schedule: {
      startAt:
        offset(
          end,
          4 * DAY
        ),

      endAt:
        offset(
          end,
          4 * DAY + HOUR
        ),
    },

    calendar: {
      eventId:
        'event-error',

      syncStatus:
        'error',
    },

    archived:
      false,
  },

  {
    _id:
      'archived',

    applicantId:
      'a1',

    kind:
      'task',

    taskStatus:
      'todo',

    archived:
      true,
  },
];


const analytics =
  buildApplicantNotesTasksAnalytics({
    items,
    now,
  });


assert.strictEqual(
  analytics.totalItems,
  7
);

assert.strictEqual(
  analytics.totalTasks,
  4
);

assert.strictEqual(
  analytics.openTasks,
  3
);

assert.strictEqual(
  analytics.completedTasks,
  1
);

assert.strictEqual(
  analytics.completionRate,
  25
);

assert.strictEqual(
  analytics.overdueTasks,
  1
);

assert.strictEqual(
  analytics.dueTodayTasks,
  1
);

assert.strictEqual(
  analytics.upcomingTasks,
  1
);

assert.strictEqual(
  analytics.scheduledReminders,
  2
);

assert.strictEqual(
  analytics.importantItems,
  2
);

assert.strictEqual(
  analytics.calendarSyncedItems,
  1
);

assert.strictEqual(
  analytics.calendarNotLinkedScheduled,
  2
);

assert.strictEqual(
  analytics.calendarNeedsUpdate,
  1
);

assert.strictEqual(
  analytics.calendarSyncErrors,
  1
);

assert.strictEqual(
  analytics.ownerSource,
  'assignee'
);

assert.strictEqual(
  analytics.ownerWorkload.length,
  1
);

assert.strictEqual(
  analytics.ownerWorkload[0]
    .label,
  'Unassigned'
);

assert.strictEqual(
  analytics.ownerWorkload[0]
    .openTasks,
  3
);

assert.strictEqual(
  internalItemMatchesDrilldown(
    'overdue_task',
    items[0],
    now
  ),
  true
);

assert.strictEqual(
  internalItemMatchesDrilldown(
    'calendar_needs_update',
    items[2],
    now
  ),
  true
);

assert.strictEqual(
  internalItemMatchesDrilldown(
    'calendar_sync_error',
    items[6],
    now
  ),
  true
);

assert.strictEqual(
  internalItemMatchesDrilldown(
    'open_task',
    items[7],
    now
  ),
  false
);


console.log(
  '✅ active Notes/Tasks summarized'
);

console.log(
  '✅ open/completed/overdue/today/upcoming task logic'
);

console.log(
  '✅ reminders and Important items summarized'
);

console.log(
  '✅ Calendar synced/not-added/needs-update/error states separated'
);

console.log(
  '✅ workload derived from assignee with legacy tasks Unassigned'
);

console.log(
  '✅ archived items excluded'
);

console.log(
  '\nAPPLICANT NOTES & TASKS ANALYTICS MODULE TEST PASSED'
);
