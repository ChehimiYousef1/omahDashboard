'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  APPLICANT_ACTIVITY_TYPES,

  taskAssigneeActivityForTransition,
  taskPriorityActivityForTransition,
  taskStatusActivityForTransition,
} = require(
  '../utils/applicantActivity'
);

const {
  setApplicantInternalTaskAssignee,
  setApplicantInternalTaskPriority,
  setApplicantInternalTaskStatus,
} = require(
  '../services/applicantInternalNotesService'
);


function queryResult(
  value
) {
  return {
    lean: async () =>
      value,
  };
}


async function run() {
  /*
   * Pure audit semantics.
   */
  for (const type of [
    'task.assigned',
    'task.reassigned',
    'task.unassigned',
    'task.priority_changed',
    'task.started',
    'task.completed',
    'task.reopened',
    'task.cancelled',
  ]) {
    assert(
      APPLICANT_ACTIVITY_TYPES
        .includes(type),
      `${type} must be registered`
    );
  }


  assert.strictEqual(
    taskAssigneeActivityForTransition({
      previousAssignee:
        {},

      assignee: {
        userId:
          'recruiter-1',
      },
    }).type,
    'task.assigned'
  );


  assert.strictEqual(
    taskAssigneeActivityForTransition({
      previousAssignee: {
        userId:
          'recruiter-1',
      },

      assignee: {
        userId:
          'recruiter-2',
      },
    }).type,
    'task.reassigned'
  );


  assert.strictEqual(
    taskAssigneeActivityForTransition({
      previousAssignee: {
        userId:
          'recruiter-1',
      },

      assignee:
        {},
    }).type,
    'task.unassigned'
  );


  assert.strictEqual(
    taskAssigneeActivityForTransition({
      previousAssignee: {
        userId:
          'recruiter-1',
      },

      assignee: {
        userId:
          'recruiter-1',
      },

      changed:
        false,
    }),
    null
  );


  assert.strictEqual(
    taskPriorityActivityForTransition({
      previousPriority:
        'low',

      priority:
        'urgent',
    }).type,
    'task.priority_changed'
  );


  assert.strictEqual(
    taskPriorityActivityForTransition({
      previousPriority:
        'high',

      priority:
        'high',

      changed:
        false,
    }),
    null
  );


  assert.strictEqual(
    taskStatusActivityForTransition({
      previousTaskStatus:
        'todo',

      taskStatus:
        'in_progress',
    }).type,
    'task.started'
  );


  assert.strictEqual(
    taskStatusActivityForTransition({
      previousTaskStatus:
        'in_progress',

      taskStatus:
        'completed',
    }).type,
    'task.completed'
  );


  assert.strictEqual(
    taskStatusActivityForTransition({
      previousTaskStatus:
        'completed',

      taskStatus:
        'todo',
    }).type,
    'task.reopened'
  );


  assert.strictEqual(
    taskStatusActivityForTransition({
      previousTaskStatus:
        'cancelled',

      taskStatus:
        'in_progress',
    }).type,
    'task.reopened'
  );


  assert.strictEqual(
    taskStatusActivityForTransition({
      previousTaskStatus:
        'todo',

      taskStatus:
        'cancelled',
    }).type,
    'task.cancelled'
  );


  assert.strictEqual(
    taskStatusActivityForTransition({
      previousTaskStatus:
        'in_progress',

      taskStatus:
        'todo',
    }).type,
    'task.updated'
  );


  assert.strictEqual(
    taskStatusActivityForTransition({
      previousTaskStatus:
        'completed',

      taskStatus:
        'completed',

      changed:
        false,
    }),
    null
  );


  /*
   * Service state-awareness using an in-memory
   * model double that supports findOne().
   */
  const APPLICANT_ID =
    '64b000000000000000000001';

  const NOTE_ID =
    '64b000000000000000000002';

  let updateCalls =
    0;

  let state = {
    _id:
      new mongoose.Types.ObjectId(
        NOTE_ID
      ),

    applicantId:
      new mongoose.Types.ObjectId(
        APPLICANT_ID
      ),

    kind:
      'task',

    archived:
      false,

    content:
      'Follow up candidate',

    taskStatus:
      'completed',

    priority:
      'low',

    assignee: {
      userId:
        'recruiter-1',

      name:
        'Recruiter One',

      email:
        'one@example.com',

      role:
        'Recruiter',
    },

    completedAt:
      new Date(
        '2026-09-19T08:00:00Z'
      ),

    completedBy: {
      userId:
        'admin-1',
    },
  };


  const ApplicantModel = {
    findById() {
      return queryResult({
        _id:
          new mongoose.Types.ObjectId(
            APPLICANT_ID
          ),

        lifecycle: {
          archived:
            false,
        },

        recruitment: {
          tags:
            [],
        },
      });
    },
  };


  const NoteModel = {
    findOne() {
      return queryResult({
        ...state,

        assignee: {
          ...(state.assignee || {}),
        },
      });
    },

    findOneAndUpdate(
      filter,
      update
    ) {
      updateCalls += 1;

      state = {
        ...state,
        ...update.$set,
      };

      return queryResult({
        ...state,

        assignee: {
          ...(state.assignee || {}),
        },
      });
    },
  };


  const actor = {
    userId:
      'admin-1',

    name:
      'Admin',

    email:
      'admin@example.com',

    role:
      'Admin',
  };


  const reassigned =
    await setApplicantInternalTaskAssignee({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      assigneeUserId:
        'recruiter-2',

      actor,

      resolveUserById:
        async () => ({
          id:
            'recruiter-2',

          name:
            'Recruiter Two',

          email:
            'two@example.com',

          role:
            'Recruiter',

          status:
            'Active',
        }),

      ApplicantModel,
      NoteModel,
    });


  assert.strictEqual(
    reassigned.changed,
    true
  );

  assert.strictEqual(
    reassigned.previousStateKnown,
    true
  );

  assert.strictEqual(
    reassigned.previousAssignee
      .userId,
    'recruiter-1'
  );

  assert.strictEqual(
    reassigned.assignee
      .userId,
    'recruiter-2'
  );


  const priority =
    await setApplicantInternalTaskPriority({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      priority:
        'urgent',

      actor,

      ApplicantModel,
      NoteModel,
    });


  assert.strictEqual(
    priority.previousPriority,
    'low'
  );

  assert.strictEqual(
    priority.priority,
    'urgent'
  );

  assert.strictEqual(
    priority.changed,
    true
  );


  const reopened =
    await setApplicantInternalTaskStatus({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      taskStatus:
        'todo',

      actor,

      ApplicantModel,
      NoteModel,
    });


  assert.strictEqual(
    reopened.previousTaskStatus,
    'completed'
  );

  assert.strictEqual(
    reopened.taskStatus,
    'todo'
  );

  assert.strictEqual(
    reopened.changed,
    true
  );

  assert.strictEqual(
    reopened.note.completedAt,
    null
  );


  const writesBeforeNoop =
    updateCalls;


  const noop =
    await setApplicantInternalTaskStatus({
      applicantId:
        APPLICANT_ID,

      noteId:
        NOTE_ID,

      taskStatus:
        'todo',

      actor,

      ApplicantModel,
      NoteModel,
    });


  assert.strictEqual(
    noop.changed,
    false
  );

  assert.strictEqual(
    updateCalls,
    writesBeforeNoop,
    'same-status update must not write again'
  );


  console.log(
    '✅ task activity transition semantics'
  );

  console.log(
    '✅ previous-state service capture'
  );

  console.log(
    '✅ same-status idempotency'
  );

  console.log(
    '\nAPPLICANT TASK ACTIVITY SEMANTICS TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
