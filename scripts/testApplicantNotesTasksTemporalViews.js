'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  buildNotesTasksTemporalViews,
} = require(
  '../services/analytics/applicantNotesTasksAnalytics'
);


const now =
  new Date(
    '2026-09-17T12:30:00.000Z'
  );


const items = [
  {
    kind:
      'task',

    taskStatus:
      'completed',

    archived:
      false,

    createdAt:
      new Date(
        '2026-09-17T11:10:00.000Z'
      ),

    completedAt:
      new Date(
        '2026-09-17T12:05:00.000Z'
      ),

    schedule: {
      reminderAt:
        new Date(
          '2026-09-17T10:30:00.000Z'
        ),
    },
  },

  {
    kind:
      'note',

    archived:
      false,

    createdAt:
      new Date(
        '2026-09-16T08:00:00.000Z'
      ),

    schedule: {},
  },
];


const views =
  buildNotesTasksTemporalViews({
    items,
    now,
  });


assert.strictEqual(
  views.hourly.length,
  24
);

assert.strictEqual(
  views.daily.length,
  30
);

assert.strictEqual(
  views.weekly.length,
  12
);

assert.strictEqual(
  views.monthly.length,
  12
);


function totals(
  series
) {
  return series.reduce(
    (
      total,
      point
    ) => ({
      tasksCreated:
        total.tasksCreated +
        point.tasksCreated,

      tasksCompleted:
        total.tasksCompleted +
        point.tasksCompleted,

      notesCreated:
        total.notesCreated +
        point.notesCreated,

      remindersScheduled:
        total.remindersScheduled +
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
}


for (
  const key
  of [
    'hourly',
    'daily',
    'weekly',
    'monthly',
  ]
) {
  const total =
    totals(
      views[key]
    );

  assert.ok(
    total.tasksCreated >=
      1
  );

  assert.ok(
    total.tasksCompleted >=
      1
  );
}


assert.strictEqual(
  mongoose.connection.readyState,
  0
);


console.log(
  '✅ Hourly series: 24 buckets'
);

console.log(
  '✅ Daily series: 30 buckets'
);

console.log(
  '✅ Weekly series: 12 buckets'
);

console.log(
  '✅ Monthly series: 12 buckets'
);

console.log(
  '✅ timestamps aggregated into real temporal buckets'
);

console.log(
  '✅ no MongoDB connection used'
);

console.log(
  '\nAPPLICANT NOTES/TASKS TEMPORAL VIEWS TEST PASSED'
);
