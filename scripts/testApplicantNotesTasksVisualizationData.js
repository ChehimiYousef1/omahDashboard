'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  buildNotesTasksOperationalTrend,
  buildApplicantNotesTasksAnalytics,
} = require(
  '../services/analytics/applicantNotesTasksAnalytics'
);


const now =
  new Date(
    '2026-09-17T12:00:00.000Z'
  );


const items = [
  {
    _id:
      'task-created',

    kind:
      'task',

    taskStatus:
      'todo',

    archived:
      false,

    createdAt:
      new Date(
        '2026-09-15T09:00:00.000Z'
      ),

    schedule: {
      reminderAt:
        new Date(
          '2026-09-16T08:00:00.000Z'
        ),
    },

    calendar: {
      syncStatus:
        'not_synced',
    },
  },

  {
    _id:
      'task-completed',

    kind:
      'task',

    taskStatus:
      'completed',

    archived:
      false,

    createdAt:
      new Date(
        '2026-09-10T09:00:00.000Z'
      ),

    completedAt:
      new Date(
        '2026-09-17T08:00:00.000Z'
      ),

    schedule: {},

    calendar: {
      syncStatus:
        'not_synced',
    },
  },

  {
    _id:
      'note-created',

    kind:
      'note',

    archived:
      false,

    createdAt:
      new Date(
        '2026-09-17T07:00:00.000Z'
      ),

    schedule: {},

    calendar: {
      syncStatus:
        'not_synced',
    },
  },

  {
    _id:
      'archived-task',

    kind:
      'task',

    taskStatus:
      'todo',

    archived:
      true,

    createdAt:
      new Date(
        '2026-09-17T06:00:00.000Z'
      ),
  },
];


const trend =
  buildNotesTasksOperationalTrend({
    items,
    now,
    days:
      30,
  });


assert.strictEqual(
  trend.length,
  30
);


const total =
  trend.reduce(
    (
      accumulator,
      point
    ) => ({
      tasksCreated:
        accumulator
          .tasksCreated +
        point.tasksCreated,

      tasksCompleted:
        accumulator
          .tasksCompleted +
        point.tasksCompleted,

      notesCreated:
        accumulator
          .notesCreated +
        point.notesCreated,

      remindersScheduled:
        accumulator
          .remindersScheduled +
        point.remindersScheduled,
    }),

    {
      tasksCreated:
        0,

      tasksCompleted:
        0,

      notesCreated:
        0,

      remindersScheduled:
        0,
    }
  );


assert.deepStrictEqual(
  total,

  {
    tasksCreated:
      2,

    tasksCompleted:
      1,

    notesCreated:
      1,

    remindersScheduled:
      1,
  }
);


const analytics =
  buildApplicantNotesTasksAnalytics({
    items,
    now,
  });


assert.strictEqual(
  analytics.trendWindowDays,
  30
);


assert.strictEqual(
  analytics.operationalTrend.length,
  30
);


assert.strictEqual(
  mongoose.connection.readyState,
  0
);


console.log(
  '✅ 30-day Notes/Tasks operational trend generated'
);

console.log(
  '✅ created Tasks tracked'
);

console.log(
  '✅ completed Tasks tracked'
);

console.log(
  '✅ created Notes tracked'
);

console.log(
  '✅ scheduled Reminders tracked'
);

console.log(
  '✅ archived records excluded from trend'
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '\nAPPLICANT NOTES/TASKS VISUALIZATION DATA TEST PASSED'
);
