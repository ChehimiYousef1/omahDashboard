'use strict';

const assert =
  require('assert');

const {
  getApplicantTimeline,
} = require(
  '../services/applicantTimelineService'
);


const applicantId =
  '64b000000000000000000001';


function queryResult(
  records
) {
  return {
    async sort() {
      return records;
    },
  };
}


async function main() {
  const ApplicantModel = {
    async findById() {
      return {
        _id:
          applicantId,

        createdAt:
          new Date(
            '2026-09-09T09:00:00Z'
          ),

        recruitment: {
          status:
            'applied',

          source:
            'google-form',
        },
      };
    },
  };


  const SubmissionModel = {
    find() {
      return queryResult([
        {
          _id:
            'submission-1',

          submissionKey:
            'SUB-1',

          source:
            'google-form',

          submittedAt:
            new Date(
              '2026-09-10T10:00:00Z'
            ),
        },
      ]);
    },
  };


  const EvaluationModel = {
    find() {
      return queryResult([
        {
          _id:
            'evaluation-1',

          evaluator: {
            userId:
              'admin-1',

            name:
              'Recruiter',
          },

          status:
            'submitted',

          recommendation:
            'accept',

          weightedScore:
            88,

          createdAt:
            new Date(
              '2026-09-11T10:00:00Z'
            ),

          submittedAt:
            new Date(
              '2026-09-11T12:00:00Z'
            ),

          archivedAt:
            null,
        },
      ]);
    },
  };


  const InterviewModel = {
    find() {
      return queryResult([
        {
          _id:
            'interview-1',

          type:
            'technical',

          status:
            'completed',

          format:
            'online',

          createdBy: {
            userId:
              'admin-2',

            name:
              'Interviewer',
          },

          scheduledStart:
            new Date(
              '2026-09-12T12:00:00Z'
            ),

          scheduledEnd:
            new Date(
              '2026-09-12T13:00:00Z'
            ),

          createdAt:
            new Date(
              '2026-09-11T15:00:00Z'
            ),

          completedAt:
            new Date(
              '2026-09-12T13:05:00Z'
            ),

          outcome:
            'passed',
        },
      ]);
    },
  };


  const ActivityModel = {
    find() {
      return queryResult([
        {
          _id:
            'activity-1',

          type:
            'status.changed',

          category:
            'status',

          title:
            'Recruitment status changed',

          description:
            'Applied → Interview',

          occurredAt:
            new Date(
              '2026-09-13T09:00:00Z'
            ),

          actor: {
            userId:
              'admin-3',
          },

          source: {
            type:
              'applicant',

            id:
              applicantId,
          },

          metadata: {
            previousStatus:
              'applied',

            nextStatus:
              'interview',
          },
        },
      ]);
    },
  };


  const result =
    await getApplicantTimeline({
      applicantId,

      ApplicantModel,
      SubmissionModel,
      EvaluationModel,
      InterviewModel,
      ActivityModel,
    });


  assert.strictEqual(
    result.total,
    7
  );

  assert.deepStrictEqual(
    result.events.map(
      event =>
        event.type
    ),

    [
      'status.changed',
      'interview.completed',
      'interview.scheduled',
      'evaluation.submitted',
      'evaluation.created',
      'submission.created',
      'applicant.created',
    ]
  );

  console.log(
    '✅ native + stored events merged chronologically'
  );


  const evaluationOnly =
    await getApplicantTimeline({
      applicantId,

      category:
        'evaluation',

      ApplicantModel,
      SubmissionModel,
      EvaluationModel,
      InterviewModel,
      ActivityModel,
    });


  assert.strictEqual(
    evaluationOnly.total,
    2
  );

  assert(
    evaluationOnly
      .events
      .every(
        event =>
          event.category ===
          'evaluation'
      )
  );

  console.log(
    '✅ category filtering works'
  );


  const limited =
    await getApplicantTimeline({
      applicantId,

      limit:
        2,

      ApplicantModel,
      SubmissionModel,
      EvaluationModel,
      InterviewModel,
      ActivityModel,
    });


  assert.strictEqual(
    limited.events.length,
    2
  );

  assert.strictEqual(
    limited.total,
    7
  );

  console.log(
    '✅ timeline limit works'
  );


  await assert.rejects(
    () =>
      getApplicantTimeline({
        applicantId,

        ApplicantModel: {
          async findById() {
            return null;
          },
        },

        SubmissionModel,
        EvaluationModel,
        InterviewModel,
        ActivityModel,
      }),

    error =>
      error.code ===
      'APPLICANT_NOT_FOUND'
  );

  console.log(
    '✅ missing Applicant rejected'
  );


  console.log(
    'APPLICANT TIMELINE SERVICE TEST PASSED'
  );
}


main().catch(
  error => {
    console.error(
      error
    );

    process.exit(1);
  }
);
