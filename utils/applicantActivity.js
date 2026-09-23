'use strict';


const APPLICANT_ACTIVITY_CATEGORIES = [
  'submission',
  'profile',
  'status',
  'evaluation',
  'interview',
  'communication',
  'lifecycle',
  'note',
  'task',
  'duplicate',
  'document',
  'system',
  'talent_pool',
];


const APPLICANT_ACTIVITY_TYPES = [
  'submission.created',
  'submission.linked',

  'profile.updated',
  'profile.approved',
  'profile.tags_updated',

  'status.changed',

  'evaluation.created',
  'evaluation.submitted',
  'evaluation.reopened',
  'evaluation.archived',

  'interview.scheduled',
  'interview.rescheduled',
  'interview.completed',
  'interview.cancelled',
  'interview.no_show',
  'interview.archived',

  'communication.email.sent',
  'communication.whatsapp.sent',

  'applicant.archived',
  'applicant.restored',

  'note.created',
  'note.updated',
  'note.deleted',
  'note.archived',
  'note.restored',
  'note.permanently_deleted',
  'note.calendar_added',
  'note.calendar_updated',
  'note.calendar_removed',
  'note.reply_created',
  'note.reply_updated',
  'note.reply_archived',
  'note.reply_restored',
  'note.reply_permanently_deleted',

  'task.created',
  'task.updated',
  'task.assigned',
  'task.reassigned',
  'task.unassigned',
  'task.priority_changed',
  'task.started',
  'task.completed',
  'task.reopened',
  'task.cancelled',
  'task.archived',
  'task.restored',
  'task.permanently_deleted',
  'task.calendar_added',
  'task.calendar_updated',
  'task.calendar_removed',

  'duplicate.resolved',

  'document.uploaded',
  'document.replaced',
  'document.current_changed',
  'document.archived',
  'document.restored',
  'talent_pool.added',
  'talent_pool.updated',
  'talent_pool.removed',
  'talent_pool.restored',
  'talent_pool.review_completed',
  'talent_pool.review_scheduled',
];


function cleanTaskActivityText(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeTaskActivityAssignee(
  value
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  const userId =
    cleanTaskActivityText(
      value.userId ??
      value.id
    );

  if (!userId) {
    return {};
  }

  return {
    userId,

    name:
      cleanTaskActivityText(
        value.name
      ),

    email:
      cleanTaskActivityText(
        value.email
      ),

    role:
      cleanTaskActivityText(
        value.role
      ),
  };
}


function taskAssigneeActivityForTransition({
  previousAssignee,
  assignee,
  changed = true,
} = {}) {
  if (!changed) {
    return null;
  }

  const previous =
    normalizeTaskActivityAssignee(
      previousAssignee
    );

  const next =
    normalizeTaskActivityAssignee(
      assignee
    );

  const previousUserId =
    cleanTaskActivityText(
      previous.userId
    );

  const nextUserId =
    cleanTaskActivityText(
      next.userId
    );

  if (!nextUserId) {
    return {
      type:
        'task.unassigned',

      title:
        'Internal task unassigned',

      metadata: {
        previousAssignee:
          previous,

        assignee:
          {},
      },
    };
  }

  if (
    previousUserId &&
    previousUserId !==
      nextUserId
  ) {
    return {
      type:
        'task.reassigned',

      title:
        'Internal task reassigned',

      metadata: {
        previousAssignee:
          previous,

        assignee:
          next,
      },
    };
  }

  return {
    type:
      'task.assigned',

    title:
      'Internal task assigned',

    metadata: {
      previousAssignee:
        previous,

      assignee:
        next,
    },
  };
}


function taskPriorityActivityForTransition({
  previousPriority,
  priority,
  changed = true,
} = {}) {
  if (!changed) {
    return null;
  }

  const previous =
    cleanTaskActivityText(
      previousPriority
    );

  const next =
    cleanTaskActivityText(
      priority
    );

  return {
    type:
      'task.priority_changed',

    title:
      next
        ? 'Internal task priority changed'
        : 'Internal task priority cleared',

    metadata: {
      previousPriority:
        previous,

      priority:
        next,
    },
  };
}


function taskStatusActivityForTransition({
  previousTaskStatus,
  taskStatus,
  changed = true,
} = {}) {
  if (!changed) {
    return null;
  }

  const previous =
    cleanTaskActivityText(
      previousTaskStatus
    );

  const next =
    cleanTaskActivityText(
      taskStatus
    );

  const previousTerminal =
    previous === 'completed' ||
    previous === 'cancelled';

  const nextActionable =
    next === 'todo' ||
    next === 'in_progress';

  if (
    previousTerminal &&
    nextActionable
  ) {
    return {
      type:
        'task.reopened',

      title:
        'Internal task reopened',

      metadata: {
        previousTaskStatus:
          previous,

        taskStatus:
          next,
      },
    };
  }

  if (next === 'in_progress') {
    return {
      type:
        'task.started',

      title:
        'Internal task started',

      metadata: {
        previousTaskStatus:
          previous,

        taskStatus:
          next,
      },
    };
  }

  if (next === 'completed') {
    return {
      type:
        'task.completed',

      title:
        'Internal task completed',

      metadata: {
        previousTaskStatus:
          previous,

        taskStatus:
          next,
      },
    };
  }

  if (next === 'cancelled') {
    return {
      type:
        'task.cancelled',

      title:
        'Internal task cancelled',

      metadata: {
        previousTaskStatus:
          previous,

        taskStatus:
          next,
      },
    };
  }

  /*
   * Example:
   * in_progress -> todo.
   *
   * This is a workflow change but not a reopen,
   * because the task was never in a terminal state.
   */
  return {
    type:
      'task.updated',

    title:
      'Internal task moved to To Do',

    metadata: {
      previousTaskStatus:
        previous,

      taskStatus:
        next,
    },
  };
}


function activityCategoryForType(
  type
) {
  const value =
    String(type ?? '')
      .trim();

  if (
    value.startsWith(
      'applicant.'
    )
  ) {
    return 'lifecycle';
  }

  const category =
    value.split('.')[0];

  return (
    APPLICANT_ACTIVITY_CATEGORIES
      .includes(category)
      ? category
      : 'system'
  );
}


module.exports = {
  APPLICANT_ACTIVITY_CATEGORIES,
  APPLICANT_ACTIVITY_TYPES,

  taskAssigneeActivityForTransition,
  taskPriorityActivityForTransition,
  taskStatusActivityForTransition,

  activityCategoryForType,
};
