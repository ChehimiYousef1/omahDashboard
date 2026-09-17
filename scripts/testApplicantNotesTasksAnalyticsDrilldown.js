'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  getApplicantAnalyticsDrilldown,
} = require(
  '../services/applicantAnalyticsDrilldownService'
);


function queryResult(
  value
) {
  return {
    select() {
      return this;
    },

    sort() {
      return this;
    },

    async lean() {
      return value;
    },
  };
}


const applicants = [
  {
    _id:
      'a1',

    applicantCode:
      'APP-1',

    createdAt:
      new Date(
        '2026-09-01T00:00:00.000Z'
      ),

    identity: {
      fullName:
        'Applicant One',

      email:
        'one@example.com',

      country:
        'Lebanon',

      city:
        'Beirut',
    },

    preferences: {
      positionTrack:
        'Engineering',

      positionType:
        'Internship',
    },

    recruitment: {
      status:
        'reviewed',

      firstAppliedAt:
        new Date(
          '2026-09-01T00:00:00.000Z'
        ),
    },

    lifecycle: {
      archived:
        false,
    },
  },

  {
    _id:
      'a2',

    applicantCode:
      'APP-2',

    createdAt:
      new Date(
        '2026-09-02T00:00:00.000Z'
      ),

    identity: {
      fullName:
        'Applicant Two',

      email:
        'two@example.com',

      country:
        'Lebanon',

      city:
        'Sidon',
    },

    preferences: {
      positionTrack:
        'Data Analytics',

      positionType:
        'Internship',
    },

    recruitment: {
      status:
        'applied',

      firstAppliedAt:
        new Date(
          '2026-09-02T00:00:00.000Z'
        ),
    },

    lifecycle: {
      archived:
        false,
    },
  },
];


const notes = [
  {
    _id:
      'n1',

    applicantId:
      'a1',

    kind:
      'task',

    content:
      'Overdue task',

    taskStatus:
      'todo',

    archived:
      false,

    schedule: {
      endAt:
        new Date(
          '2026-09-16T10:00:00.000Z'
        ),
    },

    calendar: {
      syncStatus:
        'not_synced',
    },

    createdAt:
      new Date(
        '2026-09-10T10:00:00.000Z'
      ),
  },

  {
    _id:
      'n2',

    applicantId:
      'a1',

    kind:
      'note',

    content:
      'Calendar error note',

    archived:
      false,

    schedule: {
      startAt:
        new Date(
          '2026-09-20T10:00:00.000Z'
        ),

      endAt:
        new Date(
          '2026-09-20T11:00:00.000Z'
        ),
    },

    calendar: {
      eventId:
        'event-error',

      syncStatus:
        'error',

      syncError:
        'Mock provider failure',
    },

    createdAt:
      new Date(
        '2026-09-11T10:00:00.000Z'
      ),
  },

  {
    _id:
      'n3',

    applicantId:
      'a2',

    kind:
      'task',

    content:
      'Completed task',

    taskStatus:
      'completed',

    archived:
      false,

    completedAt:
      new Date(
        '2026-09-15T10:00:00.000Z'
      ),

    schedule: {},

    calendar: {
      syncStatus:
        'not_synced',
    },

    createdAt:
      new Date(
        '2026-09-12T10:00:00.000Z'
      ),
  },
];


const ApplicantModel = {
  find() {
    return queryResult(
      applicants
    );
  },
};


const NoteModel = {
  find() {
    return queryResult(
      notes
    );
  },
};


const emptyModel = {
  find() {
    return queryResult(
      []
    );
  },
};


async function get(
  type
) {
  return getApplicantAnalyticsDrilldown({
    query: {
      type,

      archived:
        'false',
    },

    ApplicantModel,

    EvaluationModel:
      emptyModel,

    InterviewModel:
      emptyModel,

    DocumentModel:
      emptyModel,

    DuplicateCaseModel:
      emptyModel,

    NoteModel,

    now:
      new Date(
        '2026-09-17T12:00:00.000Z'
      ),
  });
}


async function run() {
  const overdue =
    await get(
      'overdue_task'
    );


  assert.strictEqual(
    overdue.recordCount,
    1
  );

  assert.strictEqual(
    overdue.applicantCount,
    1
  );

  assert.strictEqual(
    overdue.items[0]
      .applicant
      .id,
    'a1'
  );


  const syncError =
    await get(
      'calendar_sync_error'
    );


  assert.strictEqual(
    syncError.recordCount,
    1
  );

  assert.strictEqual(
    syncError.applicantCount,
    1
  );

  assert.strictEqual(
    syncError.items[0]
      .applicant
      .id,
    'a1'
  );


  const completed =
    await get(
      'completed_task'
    );


  assert.strictEqual(
    completed.recordCount,
    1
  );

  assert.strictEqual(
    completed.applicantCount,
    1
  );

  assert.strictEqual(
    completed.items[0]
      .applicant
      .id,
    'a2'
  );


  const open =
    await get(
      'open_task'
    );


  assert.strictEqual(
    open.recordCount,
    1
  );

  assert.strictEqual(
    open.items[0]
      .recordCount,
    1
  );


  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );


  console.log(
    '✅ overdue task exact Applicant drill-down'
  );

  console.log(
    '✅ Calendar sync-error exact Applicant drill-down'
  );

  console.log(
    '✅ completed task exact Applicant drill-down'
  );

  console.log(
    '✅ open task exact Applicant drill-down'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT NOTES & TASKS ANALYTICS DRILL-DOWN TEST PASSED'
  );
}


run().catch(
  error => {
    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
