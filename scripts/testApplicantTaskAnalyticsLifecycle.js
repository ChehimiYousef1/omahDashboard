'use strict';

const assert =
  require('assert');

const {
  buildApplicantNotesTasksAnalytics,
  dayBounds,
} = require(
  '../services/analytics/applicantNotesTasksAnalytics'
);


const now =
  new Date(
    '2026-09-19T12:00:00.000Z'
  );

const {
  start,
  end,
} =
  dayBounds(
    now
  );

const HOUR =
  60 * 60 * 1000;

const DAY =
  24 * HOUR;


function add(
  date,
  milliseconds
) {
  return new Date(
    date.getTime() +
    milliseconds
  );
}


const author = {
  userId:
    'creator-1',

  name:
    'Original Creator',
};


const items = [
  {
    _id:
      'todo-overdue',

    applicantId:
      'a1',

    kind:
      'task',

    taskStatus:
      'todo',

    author,

    assignee: {
      userId:
        'assignee-1',

      name:
        'Assignee One',
    },

    schedule: {
      endAt:
        add(
          start,
          -HOUR
        ),
    },

    archived:
      false,
  },

  {
    _id:
      'progress-today',

    applicantId:
      'a2',

    kind:
      'task',

    taskStatus:
      'in_progress',

    author,

    assignee: {
      userId:
        'assignee-2',

      name:
        'Assignee Two',
    },

    schedule: {
      endAt:
        add(
          start,
          2 * HOUR
        ),
    },

    archived:
      false,
  },

  {
    _id:
      'completed',

    applicantId:
      'a3',

    kind:
      'task',

    taskStatus:
      'completed',

    author,

    assignee: {
      userId:
        'assignee-1',

      name:
        'Assignee One',
    },

    completedAt:
      now,

    schedule: {},

    archived:
      false,
  },

  {
    _id:
      'cancelled-old-due',

    applicantId:
      'a4',

    kind:
      'task',

    taskStatus:
      'cancelled',

    author,

    assignee: {
      userId:
        'assignee-2',

      name:
        'Assignee Two',
    },

    /*
     * If cancelled were incorrectly treated as open,
     * this task would become overdue.
     */
    schedule: {
      endAt:
        add(
          start,
          -DAY
        ),
    },

    archived:
      false,
  },

  {
    _id:
      'todo-unassigned',

    applicantId:
      'a5',

    kind:
      'task',

    taskStatus:
      'todo',

    author,

    assignee:
      {},

    schedule: {
      endAt:
        add(
          end,
          DAY
        ),
    },

    archived:
      false,
  },
];


const analytics =
  buildApplicantNotesTasksAnalytics({
    items,
    now,
  });


assert.strictEqual(
  analytics.totalTasks,
  5
);

assert.strictEqual(
  analytics.openTasks,
  3,
  'todo + in_progress only'
);

assert.strictEqual(
  analytics.completedTasks,
  1
);

assert.strictEqual(
  analytics.completionRate,
  25,
  'completed / (todo + in_progress + completed)'
);

assert.strictEqual(
  analytics.overdueTasks,
  1,
  'cancelled past-due task must not count as overdue'
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
  analytics.ownerSource,
  'assignee'
);


const statusCounts =
  Object.fromEntries(
    analytics
      .taskStatusDistribution
      .map(
        item => [
          item.key,
          item.count,
        ]
      )
  );


assert.deepStrictEqual(
  statusCounts,
  {
    todo:
      2,

    in_progress:
      1,

    completed:
      1,

    cancelled:
      1,
  }
);


const workload =
  Object.fromEntries(
    analytics
      .ownerWorkload
      .map(
        item => [
          item.label,
          item.openTasks,
        ]
      )
  );


assert.strictEqual(
  workload[
    'Assignee One'
  ],
  1
);

assert.strictEqual(
  workload[
    'Assignee Two'
  ],
  1
);

assert.strictEqual(
  workload.Unassigned,
  1
);

assert.strictEqual(
  workload[
    'Original Creator'
  ],
  undefined,
  'task author must never be used as assignee fallback'
);


console.log(
  '✅ four-state task lifecycle analytics'
);

console.log(
  '✅ cancelled excluded from actionable/deadline metrics'
);

console.log(
  '✅ completion denominator excludes cancelled'
);

console.log(
  '✅ actual assignee workload'
);

console.log(
  '✅ legacy/unassigned workload remains Unassigned'
);

console.log(
  '\nAPPLICANT TASK ANALYTICS LIFECYCLE TEST PASSED'
);
