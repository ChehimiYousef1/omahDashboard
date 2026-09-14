'use strict';

const assert =
  require('assert');

const mongoose =
  require('mongoose');

const {
  validateInterviewSchedule,
  validateInterviewType,
  validateInterviewOutcome,
  canTransitionInterviewStatus,
} = require(
  '../utils/applicantInterview'
);

const {
  normalizeParticipants,
  buildInterviewScheduleData,
  createApplicantInterview,
  updateApplicantInterview,
  completeApplicantInterview,
  cancelApplicantInterview,
  archiveApplicantInterview,
} = require(
  '../services/applicantInterviewService'
);


async function main() {
  /*
   * Pure validation.
   */
  assert.strictEqual(
    validateInterviewType(
      ' Technical '
    ),

    'technical'
  );

  assert.strictEqual(
    validateInterviewOutcome(
      ' Recommended '
    ),

    'recommended'
  );

  assert.strictEqual(
    canTransitionInterviewStatus(
      'scheduled',
      'completed'
    ),

    true
  );

  assert.strictEqual(
    canTransitionInterviewStatus(
      'completed',
      'scheduled'
    ),

    false
  );

  assert.throws(
    () =>
      validateInterviewSchedule({
        scheduledStart:
          '2026-09-14T12:00:00Z',

        scheduledEnd:
          '2026-09-14T11:00:00Z',
      }),

    /end time must be after/
  );

  console.log(
    '✅ interview constants + schedule validation'
  );


  const participants =
    normalizeParticipants([
      {
        userId:
          'admin-1',

        name:
          'Interviewer',

        email:
          'INTERVIEWER@example.com',

        role:
          'Admin',
      },
    ]);

  assert.strictEqual(
    participants[0].email,

    'interviewer@example.com'
  );

  assert.throws(
    () =>
      normalizeParticipants(
        []
      ),

    /At least one/
  );

  console.log(
    '✅ participant validation'
  );


  const applicantId =
    new mongoose.Types.ObjectId();

  const submissionId =
    new mongoose.Types.ObjectId();

  const interviewId =
    new mongoose.Types.ObjectId();

  const activeApplicant = {
    _id:
      applicantId,

    lifecycle: {
      archived: false,
    },
  };

  const linkedSubmission = {
    _id:
      submissionId,

    applicantId,
  };


  /*
   * Create — mock only.
   */
  let createdPayload =
    null;

  const ApplicantModel = {
    async findById() {
      return activeApplicant;
    },
  };

  const SubmissionModel = {
    async findById() {
      return linkedSubmission;
    },
  };

  const CreateInterviewModel = {
    async create(payload) {
      createdPayload =
        payload;

      return {
        _id:
          interviewId,

        ...payload,
      };
    },
  };

  const created =
    await createApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      submissionId:
        String(
          submissionId
        ),

      type:
        'technical',

      scheduledStart:
        '2026-09-14T10:00:00Z',

      scheduledEnd:
        '2026-09-14T11:00:00Z',

      timezone:
        'Asia/Beirut',

      format:
        'online',

      meetingProvider:
        'google_meet',

      meetingLink:
        'https://example.com/meeting',

      participants: [
        {
          userId:
            'admin-1',

          name:
            'Admin User',

          role:
            'Admin',
        },
      ],

      notes:
        'Technical interview',

      createdBy: {
        userId:
          'admin-1',

        name:
          'Admin User',

        role:
          'Admin',
      },

      ApplicantModel,
      SubmissionModel,

      InterviewModel:
        CreateInterviewModel,

      syncInterviewMeeting:
        async ({ interview }) =>
          interview,
    });

  assert.strictEqual(
    created.status,
    'scheduled'
  );

  assert.strictEqual(
    created.outcome,
    'pending'
  );

  assert.strictEqual(
    createdPayload.createdBy
      .userId,

    'admin-1'
  );

  console.log(
    '✅ interview creation rules'
  );


  /*
   * Create notification wiring.
   *
   * Meeting synchronization must complete
   * before the notification receives the
   * interview.
   */
  const notificationOrder =
    [];

  let notificationPayload =
    null;

  const testTransporter = {
    label:
      'fake-interview-transporter',
  };

  const notifiedInterview =
    await createApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      submissionId:
        null,

      type:
        'technical',

      scheduledStart:
        '2026-09-16T10:00:00Z',

      scheduledEnd:
        '2026-09-16T11:00:00Z',

      timezone:
        'Asia/Beirut',

      format:
        'online',

      meetingProvider:
        'google_meet',

      participants: [
        {
          userId:
            'admin-1',

          name:
            'Admin User',

          email:
            'interviewer@example.com',

          role:
            'Interviewer',
        },
      ],

      createdBy: {
        userId:
          'admin-1',

        name:
          'Admin User',

        role:
          'Admin',
      },

      ApplicantModel,

      InterviewModel:
        CreateInterviewModel,

      syncInterviewMeeting:
        async ({
          interview,
        }) => {
          notificationOrder.push(
            'sync'
          );

          return {
            ...interview,

            meeting: {
              provider:
                'google_meet',

              status:
                'created',

              joinUrl:
                'https://meet.google.com/synced-test',
            },

            meetingLink:
              'https://meet.google.com/synced-test',
          };
        },

      notifyInterview:
        async (payload) => {
          notificationOrder.push(
            'notify'
          );

          notificationPayload =
            payload;

          return {
            status:
              'sent',
          };
        },

      notificationTransporter:
        testTransporter,

      notificationLogger: {
        error() {},
      },
    });


  assert.deepStrictEqual(
    notificationOrder,

    [
      'sync',
      'notify',
    ]
  );

  assert.strictEqual(
    notificationPayload
      .interview
      .meeting
      .joinUrl,

    'https://meet.google.com/synced-test'
  );

  assert.strictEqual(
    notificationPayload
      .eventType,

    'scheduled'
  );

  assert.strictEqual(
    notificationPayload
      .transporter,

    testTransporter
  );

  assert.strictEqual(
    notificationPayload
      .applicant,

    activeApplicant
  );

  assert.strictEqual(
    notifiedInterview
      .meeting
      .joinUrl,

    'https://meet.google.com/synced-test'
  );

  console.log(
    '✅ notification runs after meeting sync with generated Meet URL'
  );


  /*
   * Notification delivery is secondary.
   *
   * A notification exception must never
   * roll back an already-created interview
   * or synchronized meeting.
   */
  let notificationFailureLog =
    '';

  const notificationFailureCreated =
    await createApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      submissionId:
        null,

      type:
        'screening',

      scheduledStart:
        '2026-09-17T10:00:00Z',

      scheduledEnd:
        '2026-09-17T10:30:00Z',

      timezone:
        'Asia/Beirut',

      format:
        'online',

      meetingProvider:
        'google_meet',

      participants: [
        {
          name:
            'Interviewer',

          email:
            'interviewer@example.com',

          role:
            'Interviewer',
        },
      ],

      createdBy: {
        userId:
          'admin-1',
      },

      ApplicantModel,

      InterviewModel:
        CreateInterviewModel,

      syncInterviewMeeting:
        async ({
          interview,
        }) => ({
          ...interview,

          meeting: {
            provider:
              'google_meet',

            status:
              'created',

            joinUrl:
              'https://meet.google.com/preserved-test',
          },

          meetingLink:
            'https://meet.google.com/preserved-test',
        }),

      notifyInterview:
        async () => {
          throw new Error(
            'Synthetic notification failure'
          );
        },

      notificationTransporter:
        testTransporter,

      notificationLogger: {
        error(...args) {
          notificationFailureLog =
            args
              .map(String)
              .join(' ');
        },
      },
    });


  assert.strictEqual(
    notificationFailureCreated
      .status,

    'scheduled'
  );

  assert.strictEqual(
    notificationFailureCreated
      .meeting
      .status,

    'created'
  );

  assert.strictEqual(
    notificationFailureCreated
      .meeting
      .joinUrl,

    'https://meet.google.com/preserved-test'
  );

  assert(
    notificationFailureLog
      .includes(
        'Synthetic notification failure'
      )
  );

  console.log(
    '✅ notification failure does not fail interview creation'
  );


  /*
   * Optional submission.
   */
  let optionalSubmissionCalls =
    0;

  await createApplicantInterview({
    applicantId:
      String(
        applicantId
      ),

    submissionId:
      null,

    type:
      'screening',

    scheduledStart:
      '2026-09-15T10:00:00Z',

    scheduledEnd:
      '2026-09-15T10:30:00Z',

    format:
      'online',

    meetingProvider:
      'google_meet',

    participants: [
      {
        name:
          'Interviewer',
      },
    ],

    createdBy: {
      userId:
        'admin-1',
    },

    ApplicantModel,

    SubmissionModel: {
      async findById() {
        optionalSubmissionCalls +=
          1;

        return null;
      },
    },

    InterviewModel:
      CreateInterviewModel,
    syncInterviewMeeting:
      async ({ interview }) =>
        interview,

  });

  assert.strictEqual(
    optionalSubmissionCalls,
    0
  );

  console.log(
    '✅ submission relationship is optional'
  );


  /*
   * Update/reschedule.
   */
  const existingInterview = {
    _id:
      interviewId,

    applicantId,

    status:
      'scheduled',

    scheduledStart:
      new Date(
        '2026-09-14T10:00:00Z'
      ),

    scheduledEnd:
      new Date(
        '2026-09-14T11:00:00Z'
      ),
  };

  let updateFilter =
    null;

  let updatePayload =
    null;

  let updateOptions =
    null;

  const UpdateInterviewModel = {
    async findOne() {
      return existingInterview;
    },

    async findOneAndUpdate(
      filter,
      update,
      options
    ) {
      updateFilter =
        filter;

      updatePayload =
        update;

      updateOptions =
        options;

      return {
        ...existingInterview,
        ...update.$set,
      };
    },
  };

  const updated =
    await updateApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      interviewId:
        String(
          interviewId
        ),

      scheduledStart:
        '2026-09-14T12:00:00Z',

      scheduledEnd:
        '2026-09-14T13:00:00Z',

      meetingProvider:
        'google_meet',

      ApplicantModel,

      InterviewModel:
        UpdateInterviewModel,
      syncInterviewMeeting:
        async ({ interview }) =>
          interview,

    });

  assert.strictEqual(
    updateFilter.status,
    'scheduled'
  );

  assert.strictEqual(
    updateOptions
      .runValidators,

    true
  );

  assert.strictEqual(
    updated.meeting
      .provider,

    'google_meet'
  );

  assert.strictEqual(
    updated.meeting
      .status,

    'pending'
  );

  assert.strictEqual(
    updated.meetingLink,

    ''
  );

  console.log(
    '✅ reschedule/edit protected by scheduled status'
  );


  /*
   * Complete + outcome/feedback.
   */
  let completionPayload =
    null;

  const CompleteInterviewModel = {
    async findOne() {
      return existingInterview;
    },

    async findOneAndUpdate(
      filter,
      update
    ) {
      completionPayload =
        update.$set;

      return {
        ...existingInterview,
        ...update.$set,
      };
    },
  };

  const completed =
    await completeApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      interviewId:
        String(
          interviewId
        ),

      outcome:
        'recommended',

      feedback:
        'Strong technical discussion.',

      ApplicantModel,

      InterviewModel:
        CompleteInterviewModel,

      now:
        () =>
          new Date(
            '2026-09-14T11:05:00Z'
          ),
    });

  assert.strictEqual(
    completed.status,
    'completed'
  );

  assert.strictEqual(
    completed.outcome,
    'recommended'
  );

  assert.strictEqual(
    completionPayload.feedback,

    'Strong technical discussion.'
  );

  console.log(
    '✅ completion + outcome + feedback'
  );


  /*
   * Cancel + provider cleanup handoff.
   *
   * Mock only:
   * no Google request is made here.
   */
  let cancellationPayload =
    null;

  let cancellationSyncCalled =
    false;

  let cancellationSyncInterview =
    null;

  const scheduledInterviewForCancellation = {
    _id:
      interviewId,

    applicantId,

    status:
      'scheduled',

    archived:
      false,

    format:
      'online',

    meeting: {
      provider:
        'google_meet',

      status:
        'created',

      providerMeetingId:
        'test-meet',

      providerEventId:
        'google-event-test',

      joinUrl:
        'https://meet.google.com/test-meet',

      syncError:
        '',
    },
  };

  const CancelInterviewModel = {
    async findOne() {
      return scheduledInterviewForCancellation;
    },

    async findOneAndUpdate(
      filter,
      update
    ) {
      cancellationPayload =
        update.$set;

      return {
        ...scheduledInterviewForCancellation,
        ...update.$set,
      };
    },
  };

  const cancelled =
    await cancelApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      interviewId:
        String(
          interviewId
        ),

      reason:
        'Candidate unavailable',

      ApplicantModel,

      InterviewModel:
        CancelInterviewModel,

      syncInterviewMeeting:
        async ({
          interview,
        }) => {
          cancellationSyncCalled =
            true;

          cancellationSyncInterview =
            interview;

          return interview;
        },

      now:
        () =>
          new Date(
            '2026-09-14T11:15:00Z'
          ),
    });

  assert.strictEqual(
    cancelled.status,
    'cancelled'
  );

  assert.strictEqual(
    cancellationPayload
      .cancellationReason,

    'Candidate unavailable'
  );

  assert.strictEqual(
    cancellationSyncCalled,
    true,
    'Cancellation must hand off to meeting synchronization.'
  );

  assert.strictEqual(
    cancellationSyncInterview
      .meeting
      .providerEventId,

    'google-event-test',
    'Cancellation synchronization must retain the existing provider event ID.'
  );

  console.log(
    '✅ cancellation hands off existing provider event for cleanup'
  );


  /*
   * Archive = soft-delete only.
   */
  let archivePayload =
    null;

  const ArchiveInterviewModel = {
    async findOne() {
      return existingInterview;
    },

    async findOneAndUpdate(
      filter,
      update
    ) {
      archivePayload =
        update.$set;

      return {
        ...existingInterview,
        ...update.$set,
      };
    },
  };

  const archived =
    await archiveApplicantInterview({
      applicantId:
        String(
          applicantId
        ),

      interviewId:
        String(
          interviewId
        ),

      archivedBy:
        'admin-1',

      reason:
        'Duplicate schedule',

      ApplicantModel,

      InterviewModel:
        ArchiveInterviewModel,

      now:
        () =>
          new Date(
            '2026-09-14T09:00:00Z'
          ),
    });

  assert.strictEqual(
    archived.archived,
    true
  );

  assert.strictEqual(
    archivePayload
      .archiveReason,

    'Duplicate schedule'
  );

  const serviceSource =
    require('fs')
      .readFileSync(
        require.resolve(
          '../services/applicantInterviewService'
        ),
        'utf8'
      );

  for (
    const forbidden
    of [
      'findByIdAndDelete',
      'findOneAndDelete',
      '.deleteOne(',
      '.deleteMany(',
    ]
  ) {
    assert.strictEqual(
      serviceSource.includes(
        forbidden
      ),

      false,

      'Hard delete found: ' +
        forbidden
    );
  }

  console.log(
    '✅ archive is soft-delete only'
  );


  const scheduleData =
    buildInterviewScheduleData({
      type:
        'final',

      scheduledStart:
        '2026-09-20T14:00:00Z',

      scheduledEnd:
        '2026-09-20T15:00:00Z',

      format:
        'online',

      meetingProvider:
        'google_meet',

      participants: [
        {
          name:
            'Final Interviewer',
        },
      ],

      organizer: {
        userId:
          'admin-1',
      },
    });

  assert.strictEqual(
    scheduleData.status,
    'scheduled'
  );

  /*
   * Important:
   * Nothing in this service updates
   * Applicant.recruitment.status.
   */
  assert.strictEqual(
    Object.prototype
      .hasOwnProperty
      .call(
        scheduleData,
        'recruitment'
      ),

    false
  );

  console.log(
    '✅ interview lifecycle remains separate from recruitment status'
  );

  console.log(
    '✅ no MongoDB connection used'
  );

  console.log(
    '\nINTERVIEW MANAGEMENT SERVICE TEST PASSED'
  );
}

main().catch(
  (error) => {
    console.error(error);

    process.exit(1);
  }
);

