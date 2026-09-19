'use strict';


const UPCOMING_TASK_WINDOW_DAYS =
  7;


const NOTES_TASKS_TREND_WINDOW_DAYS =
  30;


const INTERNAL_NOTE_ANALYTICS_PROJECTION = [
  '_id',
  'applicantId',
  'kind',
  'content',
  'taskStatus',
  'priority',
  'assignee',
  'important',
  'schedule.startAt',
  'schedule.endAt',
  'schedule.reminderAt',
  'schedule.reminderNote',
  'calendar.provider',
  'calendar.eventId',
  'calendar.eventUrl',
  'calendar.syncStatus',
  'calendar.syncedAt',
  'calendar.syncError',
  'author',
  'completedAt',
  'completedBy',
  'archived',
  'createdAt',
  'updatedAt',
].join(' ');


const INTERNAL_ITEM_DRILLDOWN_TYPES =
  Object.freeze([
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
  ]);


const INTERNAL_ITEM_DRILLDOWN_METADATA = {
  open_task: {
    label:
      'Open Internal Tasks',

    description:
      'Applicants with one or more active internal tasks that are not completed.',
  },

  overdue_task: {
    label:
      'Overdue Internal Tasks',

    description:
      'Applicants with open internal tasks whose configured due date has passed.',
  },

  due_today_task: {
    label:
      'Internal Tasks Due Today',

    description:
      'Applicants with open internal tasks due during the current server-local calendar day.',
  },

  upcoming_task: {
    label:
      'Upcoming Internal Tasks',

    description:
      `Applicants with open internal tasks due within the next ${UPCOMING_TASK_WINDOW_DAYS} days.`,
  },

  completed_task: {
    label:
      'Completed Internal Tasks',

    description:
      'Applicants with internal tasks currently marked completed.',
  },

  scheduled_reminder: {
    label:
      'Scheduled Internal Reminders',

    description:
      'Applicants with active internal notes or tasks that have a reminder date configured.',
  },

  important_internal_item: {
    label:
      'Important Internal Notes & Tasks',

    description:
      'Applicants with active internal notes or tasks marked Important.',
  },

  calendar_synced_internal_item: {
    label:
      'Calendar-Synced Internal Items',

    description:
      'Applicants with active internal notes or tasks linked to an external Calendar event and currently marked synced.',
  },

  calendar_not_linked_scheduled: {
    label:
      'Scheduled Items Not Added to Calendar',

    description:
      'Applicants with schedule-ready internal notes or tasks that have not been explicitly added to Google Calendar.',
  },

  calendar_needs_update: {
    label:
      'Calendar Items Needing Update',

    description:
      'Applicants with an already-linked Calendar event whose local internal item changed and now requires an explicit Calendar update.',
  },

  calendar_sync_error: {
    label:
      'Internal Calendar Sync Errors',

    description:
      'Applicants with internal notes or tasks currently carrying a Calendar synchronization error.',
  },
};


function validDate(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function dayBounds(
  now =
    new Date()
) {
  const start =
    new Date(now);

  start.setHours(
    0,
    0,
    0,
    0
  );

  const end =
    new Date(now);

  end.setHours(
    23,
    59,
    59,
    999
  );

  return {
    start,
    end,
  };
}


function taskDueAt(
  item
) {
  return (
    validDate(
      item?.schedule?.endAt
    ) ||
    validDate(
      item?.schedule?.startAt
    )
  );
}


function hasCalendarRange(
  item
) {
  const start =
    validDate(
      item?.schedule?.startAt
    );

  const end =
    validDate(
      item?.schedule?.endAt
    );

  return Boolean(
    start &&
    end &&
    end > start
  );
}


function isActiveItem(
  item
) {
  return (
    item &&
    item.archived !==
      true
  );
}


function isTask(
  item
) {
  return (
    item?.kind ===
    'task'
  );
}


function normalizedTaskStatus(
  item
) {
  const value =
    String(
      item?.taskStatus ||
      'todo'
    )
      .trim()
      .toLowerCase();

  return [
    'todo',
    'in_progress',
    'completed',
    'cancelled',
  ].includes(
    value
  )
    ? value
    : 'todo';
}


function isOpenTask(
  item
) {
  if (
    !isActiveItem(
      item
    ) ||
    !isTask(
      item
    )
  ) {
    return false;
  }

  const status =
    normalizedTaskStatus(
      item
    );

  return (
    status ===
      'todo' ||
    status ===
      'in_progress'
  );
}


function isCompletedTask(
  item
) {
  return (
    isActiveItem(
      item
    ) &&
    isTask(
      item
    ) &&
    normalizedTaskStatus(
      item
    ) ===
      'completed'
  );
}


function isCancelledTask(
  item
) {
  return (
    isActiveItem(
      item
    ) &&
    isTask(
      item
    ) &&
    normalizedTaskStatus(
      item
    ) ===
      'cancelled'
  );
}


function dueState(
  item,
  now =
    new Date()
) {
  if (
    !isOpenTask(
      item
    )
  ) {
    return null;
  }

  const due =
    taskDueAt(
      item
    );

  if (!due) {
    return 'unscheduled';
  }

  const {
    start,
    end,
  } =
    dayBounds(
      now
    );

  if (
    due <
    start
  ) {
    return 'overdue';
  }

  if (
    due >=
      start &&
    due <=
      end
  ) {
    return 'today';
  }

  const upcomingEnd =
    new Date(
      end.getTime() +
      (
        UPCOMING_TASK_WINDOW_DAYS *
        86_400_000
      )
    );

  if (
    due >
      end &&
    due <=
      upcomingEnd
  ) {
    return 'upcoming';
  }

  return 'later';
}


function calendarState(
  item
) {
  const eventId =
    String(
      item?.calendar
        ?.eventId ??
      ''
    ).trim();

  const syncStatus =
    String(
      item?.calendar
        ?.syncStatus ??
      'not_synced'
    ).trim();

  if (
    syncStatus ===
    'error'
  ) {
    return 'error';
  }

  if (
    eventId &&
    syncStatus ===
      'synced'
  ) {
    return 'synced';
  }

  if (
    eventId &&
    syncStatus ===
      'not_synced'
  ) {
    return 'needs_update';
  }

  if (
    !eventId &&
    hasCalendarRange(
      item
    )
  ) {
    return 'not_linked';
  }

  return 'not_applicable';
}


function internalItemMatchesDrilldown(
  type,
  item,
  now =
    new Date()
) {
  if (
    !isActiveItem(
      item
    )
  ) {
    return false;
  }

  switch (type) {
    case 'open_task':
      return isOpenTask(
        item
      );

    case 'overdue_task':
      return (
        dueState(
          item,
          now
        ) ===
        'overdue'
      );

    case 'due_today_task':
      return (
        dueState(
          item,
          now
        ) ===
        'today'
      );

    case 'upcoming_task':
      return (
        dueState(
          item,
          now
        ) ===
        'upcoming'
      );

    case 'completed_task':
      return isCompletedTask(
        item
      );

    case 'scheduled_reminder':
      return Boolean(
        validDate(
          item?.schedule
            ?.reminderAt
        )
      );

    case 'important_internal_item':
      return (
        item.important ===
        true
      );

    case 'calendar_synced_internal_item':
      return (
        calendarState(
          item
        ) ===
        'synced'
      );

    case 'calendar_not_linked_scheduled':
      return (
        calendarState(
          item
        ) ===
        'not_linked'
      );

    case 'calendar_needs_update':
      return (
        calendarState(
          item
        ) ===
        'needs_update'
      );

    case 'calendar_sync_error':
      return (
        calendarState(
          item
        ) ===
        'error'
      );

    default:
      return false;
  }
}


function internalItemDrilldownReason(
  type
) {
  const reasons = {
    open_task:
      'Internal task is still open',

    overdue_task:
      'Internal task is overdue',

    due_today_task:
      'Internal task is due today',

    upcoming_task:
      `Internal task is due within the next ${UPCOMING_TASK_WINDOW_DAYS} days`,

    completed_task:
      'Internal task is completed',

    scheduled_reminder:
      'Internal reminder is scheduled',

    important_internal_item:
      'Internal note/task is marked Important',

    calendar_synced_internal_item:
      'Internal item is synced to Calendar',

    calendar_not_linked_scheduled:
      'Scheduled internal item has not been explicitly added to Calendar',

    calendar_needs_update:
      'Linked Calendar event needs an explicit update',

    calendar_sync_error:
      'Internal Calendar synchronization error requires attention',
  };

  return (
    reasons[type] ||
    'Internal note/task workflow item'
  );
}


function internalItemRelevantDate(
  type,
  item
) {
  if (
    type ===
    'scheduled_reminder'
  ) {
    return (
      item?.schedule
        ?.reminderAt ||
      null
    );
  }

  if (
    type ===
      'completed_task'
  ) {
    return (
      item?.completedAt ||
      item?.updatedAt ||
      item?.createdAt ||
      null
    );
  }

  return (
    taskDueAt(
      item
    ) ||
    item?.schedule
      ?.reminderAt ||
    item?.updatedAt ||
    item?.createdAt ||
    null
  );
}


function ownerKey(
  actor
) {
  return (
    String(
      actor?.userId ??
      ''
    ).trim() ||
    String(
      actor?.email ??
      ''
    ).trim() ||
    String(
      actor?.name ??
      ''
    ).trim() ||
    'unassigned'
  );
}


function ownerLabel(
  actor
) {
  return (
    String(
      actor?.name ??
      ''
    ).trim() ||
    String(
      actor?.email ??
      ''
    ).trim() ||
    'Unassigned'
  );
}


function utcDayKey(
  value
) {
  const date =
    validDate(
      value
    );

  if (!date) {
    return '';
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}


function utcHourStart(
  value
) {
  const date =
    validDate(
      value
    );

  if (!date) {
    return null;
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours()
    )
  );
}


function utcDayStart(
  value
) {
  const date =
    validDate(
      value
    );

  if (!date) {
    return null;
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}


function utcWeekStart(
  value
) {
  const day =
    utcDayStart(
      value
    );

  if (!day) {
    return null;
  }

  const weekday =
    day.getUTCDay();

  const mondayOffset =
    weekday ===
      0
      ? -6
      : 1 -
        weekday;

  return new Date(
    day.getTime() +
    (
      mondayOffset *
      86_400_000
    )
  );
}


function utcMonthStart(
  value
) {
  const date =
    validDate(
      value
    );

  if (!date) {
    return null;
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1
    )
  );
}


function addUtcMonths(
  value,
  amount
) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth() +
        amount,
      1
    )
  );
}


function temporalConfig(
  granularity,
  now
) {
  const current =
    validDate(
      now
    ) ||
    new Date();


  if (
    granularity ===
    'hourly'
  ) {
    const end =
      utcHourStart(
        current
      );

    const bucketCount =
      24;

    return {
      granularity:
        'hourly',

      bucketCount,

      start:
        new Date(
          end.getTime() -
          (
            (
              bucketCount -
              1
            ) *
            3_600_000
          )
        ),

      bucketStart:
        utcHourStart,

      nextBucket:
        value =>
          new Date(
            value.getTime() +
            3_600_000
          ),

      key:
        value =>
          value.toISOString()
            .slice(
              0,
              13
            ) +
          ':00:00.000Z',
    };
  }


  if (
    granularity ===
    'weekly'
  ) {
    const end =
      utcWeekStart(
        current
      );

    const bucketCount =
      12;

    return {
      granularity:
        'weekly',

      bucketCount,

      start:
        new Date(
          end.getTime() -
          (
            (
              bucketCount -
              1
            ) *
            7 *
            86_400_000
          )
        ),

      bucketStart:
        utcWeekStart,

      nextBucket:
        value =>
          new Date(
            value.getTime() +
            (
              7 *
              86_400_000
            )
          ),

      key:
        value =>
          value.toISOString()
            .slice(
              0,
              10
            ),
    };
  }


  if (
    granularity ===
    'monthly'
  ) {
    const end =
      utcMonthStart(
        current
      );

    const bucketCount =
      12;

    return {
      granularity:
        'monthly',

      bucketCount,

      start:
        addUtcMonths(
          end,
          -(
            bucketCount -
            1
          )
        ),

      bucketStart:
        utcMonthStart,

      nextBucket:
        value =>
          addUtcMonths(
            value,
            1
          ),

      key:
        value =>
          value.toISOString()
            .slice(
              0,
              7
            ),
    };
  }


  const end =
    utcDayStart(
      current
    );

  const bucketCount =
    30;

  return {
    granularity:
      'daily',

    bucketCount,

    start:
      new Date(
        end.getTime() -
        (
          (
            bucketCount -
            1
          ) *
          86_400_000
        )
      ),

    bucketStart:
      utcDayStart,

    nextBucket:
      value =>
        new Date(
          value.getTime() +
          86_400_000
        ),

    key:
      value =>
        value.toISOString()
          .slice(
            0,
            10
          ),
  };
}


function buildNotesTasksTemporalSeries({
  items = [],
  now =
    new Date(),
  granularity =
    'daily',
} = {}) {
  const config =
    temporalConfig(
      granularity,
      now
    );


  const series =
    [];

  const bucketMap =
    new Map();


  let cursor =
    new Date(
      config.start
    );


  for (
    let index = 0;
    index <
      config.bucketCount;
    index +=
      1
  ) {
    const key =
      config.key(
        cursor
      );


    const point = {
      key,

      start:
        cursor.toISOString(),

      granularity:
        config.granularity,

      tasksCreated:
        0,

      tasksCompleted:
        0,

      notesCreated:
        0,

      remindersScheduled:
        0,
    };


    series.push(
      point
    );

    bucketMap.set(
      key,
      point
    );


    cursor =
      config.nextBucket(
        cursor
      );
  }


  function increment(
    timestamp,
    field
  ) {
    const date =
      validDate(
        timestamp
      );

    if (!date) {
      return;
    }


    const bucketStart =
      config.bucketStart(
        date
      );

    if (!bucketStart) {
      return;
    }


    const point =
      bucketMap.get(
        config.key(
          bucketStart
        )
      );


    if (point) {
      point[field] +=
        1;
    }
  }


  for (
    const item
    of items
  ) {
    if (
      !isActiveItem(
        item
      )
    ) {
      continue;
    }


    if (
      isTask(
        item
      )
    ) {
      increment(
        item.createdAt,
        'tasksCreated'
      );


      if (
        item.taskStatus ===
        'completed'
      ) {
        increment(
          item.completedAt,
          'tasksCompleted'
        );
      }
    } else {
      increment(
        item.createdAt,
        'notesCreated'
      );
    }


    increment(
      item?.schedule
        ?.reminderAt,
      'remindersScheduled'
    );
  }


  return series;
}


function buildNotesTasksTemporalViews({
  items = [],
  now =
    new Date(),
} = {}) {
  return {
    hourly:
      buildNotesTasksTemporalSeries({
        items,
        now,
        granularity:
          'hourly',
      }),

    daily:
      buildNotesTasksTemporalSeries({
        items,
        now,
        granularity:
          'daily',
      }),

    weekly:
      buildNotesTasksTemporalSeries({
        items,
        now,
        granularity:
          'weekly',
      }),

    monthly:
      buildNotesTasksTemporalSeries({
        items,
        now,
        granularity:
          'monthly',
      }),
  };
}


function buildNotesTasksOperationalTrend({
  items = [],
  now =
    new Date(),
  days =
    NOTES_TASKS_TREND_WINDOW_DAYS,
} = {}) {
  const safeDays =
    Math.max(
      1,
      Math.min(
        Number(
          days
        ) || 1,
        365
      )
    );


  const today =
    validDate(
      now
    ) ||
    new Date();


  const todayStart =
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
      )
    );


  const start =
    new Date(
      todayStart.getTime() -
      (
        (
          safeDays -
          1
        ) *
        86_400_000
      )
    );


  const series =
    [];


  const byDay =
    new Map();


  for (
    let index = 0;
    index <
      safeDays;
    index +=
      1
  ) {
    const date =
      new Date(
        start.getTime() +
        (
          index *
          86_400_000
        )
      );


    const key =
      utcDayKey(
        date
      );


    const point = {
      date:
        key,

      tasksCreated:
        0,

      tasksCompleted:
        0,

      notesCreated:
        0,

      remindersScheduled:
        0,
    };


    series.push(
      point
    );

    byDay.set(
      key,
      point
    );
  }


  function increment(
    value,
    field
  ) {
    const date =
      validDate(
        value
      );

    if (
      !date ||
      date <
        start ||
      date >=
        new Date(
          todayStart.getTime() +
          86_400_000
        )
    ) {
      return;
    }


    const point =
      byDay.get(
        utcDayKey(
          date
        )
      );


    if (!point) {
      return;
    }


    point[field] +=
      1;
  }


  for (
    const item
    of items
  ) {
    if (
      !isActiveItem(
        item
      )
    ) {
      continue;
    }


    if (
      isTask(
        item
      )
    ) {
      increment(
        item.createdAt,
        'tasksCreated'
      );


      if (
        item.taskStatus ===
        'completed'
      ) {
        increment(
          item.completedAt,
          'tasksCompleted'
        );
      }
    } else {
      increment(
        item.createdAt,
        'notesCreated'
      );
    }


    increment(
      item?.schedule
        ?.reminderAt,
      'remindersScheduled'
    );
  }


  return series;
}


function buildApplicantNotesTasksAnalytics({
  items = [],
  now =
    new Date(),
} = {}) {
  const active =
    (
      items ||
      []
    ).filter(
      isActiveItem
    );

  const notes =
    active.filter(
      item =>
        item.kind !==
        'task'
    );

  const tasks =
    active.filter(
      isTask
    );

  const openTasks =
    tasks.filter(
      isOpenTask
    );

  const completedTasks =
    tasks.filter(
      isCompletedTask
    );

  const overdueTasks =
    openTasks.filter(
      item =>
        dueState(
          item,
          now
        ) ===
        'overdue'
    );

  const dueTodayTasks =
    openTasks.filter(
      item =>
        dueState(
          item,
          now
        ) ===
        'today'
    );

  const upcomingTasks =
    openTasks.filter(
      item =>
        dueState(
          item,
          now
        ) ===
        'upcoming'
    );

  const unscheduledOpenTasks =
    openTasks.filter(
      item =>
        dueState(
          item,
          now
        ) ===
        'unscheduled'
    );

  const scheduledReminders =
    active.filter(
      item =>
        Boolean(
          validDate(
            item?.schedule
              ?.reminderAt
          )
        )
    );

  const scheduledNotes =
    notes.filter(
      item =>
        Boolean(
          validDate(
            item?.schedule
              ?.startAt
          ) ||
          validDate(
            item?.schedule
              ?.endAt
          )
        )
    );

  const importantItems =
    active.filter(
      item =>
        item.important ===
        true
    );

  const calendarSyncedItems =
    active.filter(
      item =>
        calendarState(
          item
        ) ===
        'synced'
    );

  const calendarNotLinkedScheduled =
    active.filter(
      item =>
        calendarState(
          item
        ) ===
        'not_linked'
    );

  const calendarNeedsUpdate =
    active.filter(
      item =>
        calendarState(
          item
        ) ===
        'needs_update'
    );

  const calendarSyncErrors =
    active.filter(
      item =>
        calendarState(
          item
        ) ===
        'error'
    );

  /*
   * Cancelled tasks are terminal but are not counted
   * as completed opportunities in the completion-rate
   * denominator.
   *
   * denominator = todo + in_progress + completed
   */
  const completionDenominator =
    openTasks.length +
    completedTasks.length;

  const completionRate =
    completionDenominator ===
      0
      ? 0
      : Number(
          (
            (
              completedTasks.length /
              completionDenominator
            ) *
            100
          ).toFixed(
            1
          )
        );


  const workloadMap =
    new Map();

  for (
    const task
    of openTasks
  ) {
    const assignee =
      task?.assignee &&
      typeof task.assignee ===
        'object' &&
      String(
        task.assignee
          ?.userId ||
        ''
      ).trim()
        ? task.assignee
        : null;

    const key =
      assignee
        ? ownerKey(
            assignee
          )
        : 'unassigned';

    const existing =
      workloadMap.get(
        key
      ) || {
        key,

        label:
          assignee
            ? ownerLabel(
                assignee
              )
            : 'Unassigned',

        openTasks: 0,
        overdueTasks: 0,
        dueTodayTasks: 0,
        upcomingTasks: 0,
      };

    existing.openTasks +=
      1;

    const state =
      dueState(
        task,
        now
      );

    if (
      state ===
      'overdue'
    ) {
      existing
        .overdueTasks +=
        1;
    }

    if (
      state ===
      'today'
    ) {
      existing
        .dueTodayTasks +=
        1;
    }

    if (
      state ===
      'upcoming'
    ) {
      existing
        .upcomingTasks +=
        1;
    }

    workloadMap.set(
      key,
      existing
    );
  }


  const ownerWorkload =
    [
      ...workloadMap
        .values(),
    ].sort(
      (
        left,
        right
      ) =>
        right.openTasks -
        left.openTasks ||
        left.label.localeCompare(
          right.label
        )
    );


  const dueDistribution = [
    {
      key:
        'overdue',
      label:
        'Overdue',
      count:
        overdueTasks.length,
    },

    {
      key:
        'today',
      label:
        'Due Today',
      count:
        dueTodayTasks.length,
    },

    {
      key:
        'upcoming',
      label:
        `Next ${UPCOMING_TASK_WINDOW_DAYS} Days`,
      count:
        upcomingTasks.length,
    },

    {
      key:
        'later',
      label:
        'Later',
      count:
        openTasks.filter(
          item =>
            dueState(
              item,
              now
            ) ===
            'later'
        ).length,
    },

    {
      key:
        'unscheduled',
      label:
        'No Due Date',
      count:
        unscheduledOpenTasks.length,
    },
  ];


  const taskStatusDistribution = [
    {
      key:
        'todo',
      label:
        'To Do',
      count:
        tasks.filter(
          item =>
            normalizedTaskStatus(
              item
            ) ===
            'todo'
        ).length,
    },

    {
      key:
        'in_progress',
      label:
        'In Progress',
      count:
        tasks.filter(
          item =>
            normalizedTaskStatus(
              item
            ) ===
            'in_progress'
        ).length,
    },

    {
      key:
        'completed',
      label:
        'Completed',
      count:
        completedTasks.length,
    },

    {
      key:
        'cancelled',
      label:
        'Cancelled',
      count:
        tasks.filter(
          isCancelledTask
        ).length,
    },
  ];


  const calendarDistribution = [
    {
      key:
        'synced',
      label:
        'Synced',
      count:
        calendarSyncedItems.length,
    },

    {
      key:
        'not_linked',
      label:
        'Not Added',
      count:
        calendarNotLinkedScheduled.length,
    },

    {
      key:
        'needs_update',
      label:
        'Needs Update',
      count:
        calendarNeedsUpdate.length,
    },

    {
      key:
        'error',
      label:
        'Sync Error',
      count:
        calendarSyncErrors.length,
    },
  ];


  const temporalViews =
    buildNotesTasksTemporalViews({
      items:
        active,

      now,
    });


  const operationalTrend =
    buildNotesTasksOperationalTrend({
      items:
        active,

      now,

      days:
        NOTES_TASKS_TREND_WINDOW_DAYS,
    });


  return {
    totalItems:
      active.length,

    totalNotes:
      notes.length,

    scheduledNotes:
      scheduledNotes.length,

    totalTasks:
      tasks.length,

    openTasks:
      openTasks.length,

    completedTasks:
      completedTasks.length,

    completionRate,

    overdueTasks:
      overdueTasks.length,

    dueTodayTasks:
      dueTodayTasks.length,

    upcomingTasks:
      upcomingTasks.length,

    upcomingWindowDays:
      UPCOMING_TASK_WINDOW_DAYS,


    trendWindowDays:
      NOTES_TASKS_TREND_WINDOW_DAYS,

    operationalTrend,

    temporalViews,

    unscheduledOpenTasks:
      unscheduledOpenTasks.length,

    scheduledReminders:
      scheduledReminders.length,

    importantItems:
      importantItems.length,

    calendarSyncedItems:
      calendarSyncedItems.length,

    calendarNotLinkedScheduled:
      calendarNotLinkedScheduled.length,

    calendarNeedsUpdate:
      calendarNeedsUpdate.length,

    calendarSyncErrors:
      calendarSyncErrors.length,

    ownerSource:
      'assignee',

    ownerWorkload,

    taskStatusDistribution,
    dueDistribution,
    calendarDistribution,
  };
}


module.exports = {
  UPCOMING_TASK_WINDOW_DAYS,

  INTERNAL_NOTE_ANALYTICS_PROJECTION,

  INTERNAL_ITEM_DRILLDOWN_TYPES,

  INTERNAL_ITEM_DRILLDOWN_METADATA,

  validDate,
  dayBounds,
  taskDueAt,
  hasCalendarRange,
  isOpenTask,
  isCompletedTask,
  dueState,
  calendarState,

  internalItemMatchesDrilldown,
  internalItemDrilldownReason,
  internalItemRelevantDate,

  buildNotesTasksTemporalSeries,
  buildNotesTasksTemporalViews,
  buildNotesTasksOperationalTrend,
  buildApplicantNotesTasksAnalytics,
};
