'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  getApplicantAnalytics,
} = require(
  '../services/applicantAnalyticsService'
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


const ApplicantModel = {
  find() {
    return queryResult([
      {
        _id:
          'a1',

        createdAt:
          new Date(
            '2026-09-01T00:00:00.000Z'
          ),

        applicantCode:
          'APP-1',

        identity: {
          fullName:
            'Applicant One',

          email:
            'one@example.com',

          phoneNumber:
            '123',

          country:
            'Lebanon',

          city:
            'Beirut',
        },

        education: {
          universityName:
            'University',
        },

        preferences: {
          positionTrack:
            'Engineering',

          positionType:
            'Internship',
        },

        skills: {
          primaryTechnical:
            [],
        },

        recruitment: {
          status:
            'applied',

          source:
            'form',

          firstAppliedAt:
            new Date(
              '2026-09-01T00:00:00.000Z'
            ),

          lastAppliedAt:
            new Date(
              '2026-09-01T00:00:00.000Z'
            ),

          tags:
            [],
        },

        lifecycle: {
          archived:
            false,
        },
      },
    ]);
  },
};


const emptyModel = {
  find() {
    return queryResult(
      []
    );
  },
};


const NoteModel = {
  find() {
    return queryResult([
      {
        _id:
          'task-1',

        applicantId:
          'a1',

        kind:
          'task',

        content:
          'Review Applicant documents',

        taskStatus:
          'todo',

        important:
          true,

        archived:
          false,

        author: {
          userId:
            'u1',

          name:
            'Recruiter One',

          email:
            'recruiter@example.com',
        },

        schedule: {
          endAt:
            new Date(
              '2026-09-16T10:00:00.000Z'
            ),

          reminderAt:
            new Date(
              '2026-09-16T09:00:00.000Z'
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
          'note-1',

        applicantId:
          'a1',

        kind:
          'note',

        content:
          'Prepare interview discussion',

        important:
          false,

        archived:
          false,

        author: {
          userId:
            'u1',

          name:
            'Recruiter One',
        },

        schedule: {
          startAt:
            new Date(
              '2026-09-20T08:00:00.000Z'
            ),

          endAt:
            new Date(
              '2026-09-20T09:00:00.000Z'
            ),
        },

        calendar: {
          eventId:
            'event-1',

          syncStatus:
            'synced',
        },

        createdAt:
          new Date(
            '2026-09-11T10:00:00.000Z'
          ),
      },
    ]);
  },
};


async function run() {
  const analytics =
    await getApplicantAnalytics({
      ApplicantModel,

      EvaluationModel:
        emptyModel,

      InterviewModel:
        emptyModel,

      ActivityModel:
        emptyModel,

      SubmissionModel:
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


  assert.ok(
    analytics.notesTasks,
    'notesTasks payload missing'
  );


  assert.strictEqual(
    analytics.notesTasks
      .totalItems,
    2
  );


  assert.strictEqual(
    analytics.notesTasks
      .totalTasks,
    1
  );


  assert.strictEqual(
    analytics.notesTasks
      .openTasks,
    1
  );


  assert.strictEqual(
    analytics.notesTasks
      .overdueTasks,
    1
  );


  assert.strictEqual(
    analytics.notesTasks
      .scheduledReminders,
    1
  );


  assert.strictEqual(
    analytics.notesTasks
      .importantItems,
    1
  );


  assert.strictEqual(
    analytics.notesTasks
      .calendarSyncedItems,
    1
  );


  assert.strictEqual(
    analytics.notesTasks
      .ownerSource,
    'author'
  );


  assert.strictEqual(
    mongoose.connection.readyState,
    0
  );


  console.log(
    '✅ Notes/Tasks analytics attached to Applicant analytics payload'
  );

  console.log(
    '✅ cohort Notes/Tasks aggregation correct'
  );

  console.log(
    '✅ overdue/reminder/important/Calendar metrics correct'
  );

  console.log(
    '✅ workload ownership explicitly uses author'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nAPPLICANT NOTES & TASKS ANALYTICS INTEGRATION TEST PASSED'
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
