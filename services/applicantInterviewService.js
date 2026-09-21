'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantFormSubmission =
  require(
    '../models/ApplicantFormSubmission'
  );

const ApplicantInterview =
  require(
    '../models/ApplicantInterview'
  );

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);

const {
  validateInterviewType,
  validateInterviewFormat,
  validateInterviewOutcome,
  validateInterviewSchedule,
} = require(
  '../utils/applicantInterview'
);

const {
  createInterviewMeeting,
  updateInterviewMeeting,
  cancelInterviewMeeting,
} = require(
  './applicantInterviewMeetingSyncService'
);

const {
  sendApplicantInterviewNotification,
} = require(
  './applicantInterviewNotificationService'
);


function serviceError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code = code;

  return error;
}


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function normalizeActor(
  actor,
  label = 'User'
) {
  if (
    !actor ||
    typeof actor !==
      'object' ||
    Array.isArray(actor)
  ) {
    throw serviceError(
      'INTERVIEW_ACTOR_REQUIRED',

      label +
        ' information is required.'
    );
  }

  const userId =
    cleanText(
      actor.userId
    );

  if (!userId) {
    throw serviceError(
      'INTERVIEW_ACTOR_REQUIRED',

      label +
        ' user ID is required.'
    );
  }

  return {
    userId,

    name:
      cleanText(
        actor.name
      ),

    email:
      cleanText(
        actor.email
      ).toLowerCase(),

    role:
      cleanText(
        actor.role
      ),
  };
}


function normalizeParticipants(
  participants
) {
  if (
    !Array.isArray(
      participants
    ) ||
    participants.length === 0
  ) {
    throw serviceError(
      'INTERVIEW_PARTICIPANTS_REQUIRED',

      'At least one interview participant is required.'
    );
  }

  const seen =
    new Set();

  return participants.map(
    (
      participant,
      index
    ) => {
      if (
        !participant ||
        typeof participant !==
          'object' ||
        Array.isArray(
          participant
        )
      ) {
        throw serviceError(
          'INTERVIEW_PARTICIPANT_INVALID',

          'Interview participant ' +
            (index + 1) +
            ' is invalid.'
        );
      }

      const normalized = {
        userId:
          cleanText(
            participant.userId
          ),

        name:
          cleanText(
            participant.name
          ),

        email:
          cleanText(
            participant.email
          ).toLowerCase(),

        participantType:
          cleanText(
            participant.participantType
          ).toLowerCase() ||
          'guest',

        role:
          cleanText(
            participant.role
          ),
      };

      if (
        !normalized.userId &&
        !normalized.name &&
        !normalized.email
      ) {
        throw serviceError(
          'INTERVIEW_PARTICIPANT_INVALID',

          'Each participant requires a user ID, name, or email.'
        );
      }

      const key =
        normalized.userId
          ? 'id:' +
            normalized.userId
          : normalized.email
            ? 'email:' +
              normalized.email
            : 'name:' +
              normalized.name
                .toLowerCase();

      if (seen.has(key)) {
        throw serviceError(
          'INTERVIEW_PARTICIPANT_DUPLICATE',

          'Duplicate interview participant detected.'
        );
      }

      seen.add(key);

      return normalized;
    }
  );
}


async function requireApplicant({
  applicantId,

  allowArchived = false,

  ApplicantModel =
    Applicant,
}) {
  const applicantObjectId =
    toObjectId(
      applicantId,
      'applicantId'
    );

  const applicant =
    await ApplicantModel.findById(
      applicantObjectId
    );

  if (!applicant) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',

      'Applicant was not found.'
    );
  }

  if (
    !allowArchived &&
    applicant.lifecycle
      ?.archived === true
  ) {
    throw serviceError(
      'APPLICANT_NOT_FOUND',

      'Applicant was not found or is archived.'
    );
  }

  return {
    applicantObjectId,
    applicant,
  };
}


async function validateOptionalSubmission({
  submissionId,
  applicantObjectId,

  SubmissionModel =
    ApplicantFormSubmission,
}) {
  if (
    submissionId === null ||
    submissionId === undefined ||
    cleanText(
      submissionId
    ) === ''
  ) {
    return null;
  }

  const submissionObjectId =
    toObjectId(
      submissionId,
      'submissionId'
    );

  const submission =
    await SubmissionModel.findById(
      submissionObjectId
    );

  if (!submission) {
    throw serviceError(
      'SUBMISSION_NOT_FOUND',

      'Applicant submission was not found.'
    );
  }

  if (
    !submission.applicantId ||
    String(
      submission.applicantId
    ) !==
      String(
        applicantObjectId
      )
  ) {
    throw serviceError(
      'SUBMISSION_NOT_LINKED_TO_APPLICANT',

      'Submission does not belong to this Applicant.'
    );
  }

  return submissionObjectId;
}


const INTERVIEW_MEETING_PROVIDERS = [
  'google_meet',
  'zoom',
  'microsoft_teams',
];


function validateInterviewMeetingProvider({
  format,
  meetingProvider,
}) {
  const normalizedFormat =
    validateInterviewFormat(
      format
    );

  /*
   * Physical and phone interviews do
   * not require an online provider.
   */
  if (
    normalizedFormat !==
    'online'
  ) {
    return 'none';
  }

  const provider =
    cleanText(
      meetingProvider
    ).toLowerCase();

  if (
    !INTERVIEW_MEETING_PROVIDERS
      .includes(provider)
  ) {
    throw serviceError(
      'INTERVIEW_MEETING_PROVIDER_REQUIRED',

      'Online interviews require Google Meet, Zoom, or Microsoft Teams.'
    );
  }

  return provider;
}


function newMeetingState({
  format,
  provider,
}) {
  if (
    format !==
    'online'
  ) {
    return {
      provider:
        'none',

      status:
        'not_required',

      providerMeetingId:
        '',

      providerEventId:
        '',

      joinUrl:
        '',

      lastSyncedAt:
        null,

      syncError:
        '',
    };
  }

  return {
    provider,

    status:
      'pending',

    providerMeetingId:
      '',

    providerEventId:
      '',

    joinUrl:
      '',

    lastSyncedAt:
      null,

    syncError:
      '',
  };
}


function buildInterviewScheduleData({
  type,
  scheduledStart,
  scheduledEnd,
  timezone = 'UTC',
  format = 'online',
  meetingProvider,
  location = '',
  participants,
  organizer,
  notes = '',
}) {
  const schedule =
    validateInterviewSchedule({
      scheduledStart,
      scheduledEnd,
    });

  const normalizedFormat =
    validateInterviewFormat(
      format
    );

  const normalizedMeetingProvider =
    validateInterviewMeetingProvider({
      format:
        normalizedFormat,

      meetingProvider,
    });

  return {
    type:
      validateInterviewType(
        type
      ),

    status:
      'scheduled',

    scheduledStart:
      schedule
        .scheduledStart,

    scheduledEnd:
      schedule
        .scheduledEnd,

    timezone:
      cleanText(
        timezone
      ) || 'UTC',

    format:
      normalizedFormat,

    meeting:
      newMeetingState({
        format:
          normalizedFormat,

        provider:
          normalizedMeetingProvider,
      }),

    /*
     * Legacy compatibility only.
     * Generated provider URLs will be
     * written by server integrations.
     */
    meetingLink: '',

    location:
      cleanText(
        location
      ),

    participants:
      normalizeParticipants(
        participants
      ),

    organizer:
      normalizeActor(
        organizer,
        'Organizer'
      ),

    outcome:
      'pending',

    feedback: '',

    notes:
      cleanText(
        notes
      ),
  };
}


async function createApplicantInterview({
  applicantId,
  submissionId = null,

  type,
  scheduledStart,
  scheduledEnd,
  timezone = 'UTC',
  format = 'online',
  meetingProvider,
  location = '',
  participants,
  notes = '',

  createdBy,

  ApplicantModel =
    Applicant,

  SubmissionModel =
    ApplicantFormSubmission,

  InterviewModel =
    ApplicantInterview,

  syncInterviewMeeting =
    createInterviewMeeting,

  notifyInterview =
    sendApplicantInterviewNotification,

  notificationTransporter =
    null,

  notificationLogger =
    console,
}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const linkedSubmissionId =
    await validateOptionalSubmission({
      submissionId,

      applicantObjectId:
        target
          .applicantObjectId,

      SubmissionModel,
    });

  const actor =
    normalizeActor(
      createdBy,
      'Creator'
    );

  const data =
    buildInterviewScheduleData({
      type,
      scheduledStart,
      scheduledEnd,
      timezone,
      format,
      meetingProvider,
      location,
      participants,

      organizer: actor,

      notes,
    });

  /*
   * OMAH remains the source of truth.
   *
   * Persist the interview locally first.
   * External meeting synchronization happens
   * only after the local interview exists.
   */
  const interview =
    await InterviewModel.create({
      applicantId:
        target
          .applicantObjectId,

      submissionId:
        linkedSubmissionId,

      ...data,

      createdBy:
        actor,
    });

  /*
   * For online interviews this may create
   * the external provider meeting.
   *
   * For onsite/phone interviews the sync
   * service safely returns without calling
   * an external provider.
   */
  const syncedInterview =
    await syncInterviewMeeting({
      interview,

      applicant:
        target.applicant,

      InterviewModel,
    });

  /*
   * Transactional notification is secondary
   * to interview/meeting persistence.
   *
   * Email delivery must never roll back an
   * already-created interview or provider event.
   */
  try {
    await notifyInterview({
      interview:
        syncedInterview,

      applicant:
        target.applicant,

      eventType:
        'scheduled',

      transporter:
        notificationTransporter,

      logger:
        notificationLogger,
    });
  } catch (error) {
    notificationLogger
      ?.error?.(
        'Interview notification failed after scheduling:',
        error?.message ||
          error
      );
  }

  return syncedInterview;
}


async function listApplicantInterviews({
  applicantId,
  includeArchived = false,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,
}) {
  const target =
    await requireApplicant({
      applicantId,

      allowArchived:
        true,

      ApplicantModel,
    });

  const filter = {
    applicantId:
      target
        .applicantObjectId,
  };

  if (!includeArchived) {
    filter.archived = {
      $ne: true,
    };
  }

  return InterviewModel
    .find(filter)
    .sort({
      scheduledStart: -1,
      createdAt: -1,
    });
}


async function getActiveInterview({
  applicantId,
  interviewId,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,
}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const interviewObjectId =
    toObjectId(
      interviewId,
      'interviewId'
    );

  const interview =
    await InterviewModel.findOne({
      _id:
        interviewObjectId,

      applicantId:
        target
          .applicantObjectId,

      archived: {
        $ne: true,
      },
    });

  if (!interview) {
    throw serviceError(
      'INTERVIEW_NOT_FOUND',

      'Interview was not found.'
    );
  }

  return {
    target,
    interviewObjectId,
    interview,
  };
}


function interviewAuditDateValue(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return (
      cleanText(value) ||
      null
    );
  }

  return date.toISOString();
}


function interviewAuditParticipantValue(
  participant = {}
) {
  return {
    userId:
      cleanText(
        participant?.userId
      ),

    name:
      cleanText(
        participant?.name
      ),

    email:
      cleanText(
        participant?.email
      ).toLowerCase(),

    participantType:
      cleanText(
        participant
          ?.participantType
      ).toLowerCase() ||
      'guest',

    role:
      cleanText(
        participant?.role
      ),
  };
}


function interviewAuditParticipantsValue(
  participants
) {
  if (
    !Array.isArray(
      participants
    )
  ) {
    return [];
  }

  return participants
    .map(
      interviewAuditParticipantValue
    )
    .sort(
      (
        left,
        right
      ) => {
        const leftKey = [
          left.userId,
          left.email,
          left.name.toLowerCase(),
          left.participantType,
          left.role.toLowerCase(),
        ].join('|');

        const rightKey = [
          right.userId,
          right.email,
          right.name.toLowerCase(),
          right.participantType,
          right.role.toLowerCase(),
        ].join('|');

        return leftKey.localeCompare(
          rightKey
        );
      }
    );
}


function interviewAuditValuesEqual(
  left,
  right
) {
  return (
    JSON.stringify(left) ===
    JSON.stringify(right)
  );
}


function buildInterviewAuditChanges({
  previous,
  next,
}) {
  const previousProvider =
    cleanText(
      previous
        ?.meeting
        ?.provider
    ).toLowerCase() ||
    'none';

  const nextProvider =
    cleanText(
      next
        ?.meeting
        ?.provider
    ).toLowerCase() ||
    'none';

  const candidates = [
    {
      field:
        'interview.type',

      label:
        'Interview type',

      before:
        cleanText(
          previous?.type
        ) || null,

      after:
        cleanText(
          next?.type
        ) || null,
    },

    {
      field:
        'interview.scheduledStart',

      label:
        'Scheduled start',

      before:
        interviewAuditDateValue(
          previous
            ?.scheduledStart
        ),

      after:
        interviewAuditDateValue(
          next
            ?.scheduledStart
        ),
    },

    {
      field:
        'interview.scheduledEnd',

      label:
        'Scheduled end',

      before:
        interviewAuditDateValue(
          previous
            ?.scheduledEnd
        ),

      after:
        interviewAuditDateValue(
          next
            ?.scheduledEnd
        ),
    },

    {
      field:
        'interview.timezone',

      label:
        'Timezone',

      before:
        cleanText(
          previous?.timezone
        ) || null,

      after:
        cleanText(
          next?.timezone
        ) || null,
    },

    {
      field:
        'interview.format',

      label:
        'Interview format',

      before:
        cleanText(
          previous?.format
        ) || null,

      after:
        cleanText(
          next?.format
        ) || null,
    },

    {
      field:
        'interview.meetingProvider',

      label:
        'Meeting provider',

      before:
        previousProvider,

      after:
        nextProvider,
    },

    {
      field:
        'interview.location',

      label:
        'Location',

      before:
        cleanText(
          previous?.location
        ),

      after:
        cleanText(
          next?.location
        ),
    },

    {
      field:
        'interview.participants',

      label:
        'Participants',

      before:
        interviewAuditParticipantsValue(
          previous
            ?.participants
        ),

      after:
        interviewAuditParticipantsValue(
          next
            ?.participants
        ),
    },
  ];

  return candidates.filter(
    change =>
      !interviewAuditValuesEqual(
        change.before,
        change.after
      )
  );
}


async function updateApplicantInterview({
  applicantId,
  interviewId,

  type,
  scheduledStart,
  scheduledEnd,
  timezone,
  format,
  meetingProvider,
  location,
  participants,
  notes,

  includeAuditResult =
    false,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  syncInterviewMeeting =
    updateInterviewMeeting,

  notifyInterview =
    sendApplicantInterviewNotification,

  notificationTransporter =
    null,

  notificationLogger =
    console,
}) {
  const current =
    await getActiveInterview({
      applicantId,
      interviewId,
      ApplicantModel,
      InterviewModel,
    });

  if (
    current.interview.status !==
      'scheduled'
  ) {
    throw serviceError(
      'INTERVIEW_NOT_EDITABLE',

      'Only scheduled interviews can be edited or rescheduled.'
    );
  }

  const nextStart =
    scheduledStart ===
      undefined
      ? current.interview
          .scheduledStart
      : scheduledStart;

  const nextEnd =
    scheduledEnd ===
      undefined
      ? current.interview
          .scheduledEnd
      : scheduledEnd;

  const schedule =
    validateInterviewSchedule({
      scheduledStart:
        nextStart,

      scheduledEnd:
        nextEnd,
    });

  const $set = {
    scheduledStart:
      schedule
        .scheduledStart,

    scheduledEnd:
      schedule
        .scheduledEnd,
  };

  if (type !== undefined) {
    $set.type =
      validateInterviewType(
        type
      );
  }

  if (
    timezone !== undefined
  ) {
    $set.timezone =
      cleanText(
        timezone
      ) || 'UTC';
  }

  if (format !== undefined) {
    $set.format =
      validateInterviewFormat(
        format
      );
  }

  /*
   * meetingLink is deliberately NOT
   * client-editable.
   *
   * Only provider integrations may
   * generate/update the link.
   */
  if (
    meetingProvider !== undefined ||
    format !== undefined
  ) {
    const nextFormat =
      format === undefined
        ? validateInterviewFormat(
            cleanText(
              current.interview
                .format
            ) || 'online'
          )
        : validateInterviewFormat(
            format
          );

    const currentProvider =
      cleanText(
        current.interview
          .meeting
          ?.provider
      ).toLowerCase() ||
      'none';

    let nextProvider =
      currentProvider;

    if (
      nextFormat !==
      'online'
    ) {
      nextProvider =
        'none';
    } else if (
      meetingProvider !==
      undefined
    ) {
      nextProvider =
        validateInterviewMeetingProvider({
          format:
            nextFormat,

          meetingProvider,
        });
    } else if (
      currentProvider ===
      'none'
    ) {
      throw serviceError(
        'INTERVIEW_MEETING_PROVIDER_REQUIRED',

        'Choose Google Meet, Zoom, or Microsoft Teams for this online interview.'
      );
    }

    const formatChanged =
      nextFormat !==
      current.interview
        .format;

    const providerChanged =
      nextProvider !==
      currentProvider;

    const synchronizedEventId =
      cleanText(
        current.interview
          .meeting
          ?.providerEventId
      );

    /*
     * Do not reset meeting metadata while a
     * synchronized external event still exists.
     *
     * Provider/format transition cleanup will be
     * implemented as a separate controlled flow.
     */
    if (
      synchronizedEventId &&
      (
        formatChanged ||
        providerChanged
      )
    ) {
      throw serviceError(
        'INTERVIEW_MEETING_TRANSITION_REQUIRES_CLEANUP',

        'Cancel the existing synchronized meeting before changing the interview format or meeting provider.'
      );
    }

    /*
     * When switching provider or moving
     * between online/non-online formats,
     * clear stale generated meeting data.
     *
     * Later provider synchronization will
     * handle deletion/cancellation of the
     * external provider meeting.
     */
    if (
      formatChanged ||
      providerChanged
    ) {
      $set.meeting =
        newMeetingState({
          format:
            nextFormat,

          provider:
            nextProvider,
        });

      $set.meetingLink =
        '';
    }
  }

  if (
    location !== undefined
  ) {
    $set.location =
      cleanText(
        location
      );
  }

  if (
    participants !== undefined
  ) {
    $set.participants =
      normalizeParticipants(
        participants
      );
  }

  if (notes !== undefined) {
    $set.notes =
      cleanText(
        notes
      );
  }

  const updated =
    await InterviewModel
      .findOneAndUpdate(
        {
          _id:
            current
              .interviewObjectId,

          applicantId:
            current
              .target
              .applicantObjectId,

          status:
            'scheduled',

          archived: {
            $ne: true,
          },
        },

        {
          $set,
        },

        {
          new: true,
          runValidators: true,
        }
      );

  if (!updated) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Interview changed before the update could be completed.'
    );
  }

  /*
   * OMAH remains the source of truth.
   *
   * Local changes are committed first. The
   * provider event is then synchronized using
   * its existing providerEventId.
   */
  const syncedInterview =
    await syncInterviewMeeting({
      interview:
        updated,

      applicant:
        current
          .target
          .applicant,

      InterviewModel,
    });

  const previousStartMs =
    new Date(
      current
        .interview
        .scheduledStart
    ).getTime();

  const previousEndMs =
    new Date(
      current
        .interview
        .scheduledEnd
    ).getTime();

  const syncedStartMs =
    new Date(
      syncedInterview
        .scheduledStart
    ).getTime();

  const syncedEndMs =
    new Date(
      syncedInterview
        .scheduledEnd
    ).getTime();

  const scheduleChanged =
    previousStartMs !==
      syncedStartMs ||
    previousEndMs !==
      syncedEndMs ||
    cleanText(
      current
        .interview
        .timezone
    ) !==
      cleanText(
        syncedInterview
          .timezone
      );

  if (scheduleChanged) {
    try {
      await notifyInterview({
        interview:
          syncedInterview,

        applicant:
          current
            .target
            .applicant,

        eventType:
          'rescheduled',

        transporter:
          notificationTransporter,

        logger:
          notificationLogger,
      });
    } catch (error) {
      notificationLogger
        ?.error?.(
          'Interview notification failed after rescheduling:',
          error?.message ||
            error
        );
    }
  }

  if (includeAuditResult) {
    const auditChanges =
      buildInterviewAuditChanges({
        previous:
          current.interview,

        next:
          syncedInterview,
      });

    const notesChanged =
      cleanText(
        current.interview
          ?.notes
      ) !==
      cleanText(
        syncedInterview
          ?.notes
      );

    const rescheduled =
      auditChanges.some(
        change =>
          change.field ===
            'interview.scheduledStart' ||
          change.field ===
            'interview.scheduledEnd' ||
          change.field ===
            'interview.timezone'
      );

    return {
      interview:
        syncedInterview,

      auditChanges,

      auditMetadata: {
        notesChanged,
        rescheduled,
      },
    };
  }

  return syncedInterview;
}


async function completeApplicantInterview({
  applicantId,
  interviewId,

  outcome = 'pending',
  feedback = '',
  notes,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  now =
    () => new Date(),
}) {
  const current =
    await getActiveInterview({
      applicantId,
      interviewId,
      ApplicantModel,
      InterviewModel,
    });

  if (
    current.interview.status !==
      'scheduled'
  ) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Only a scheduled interview can be completed.'
    );
  }

  const $set = {
    status:
      'completed',

    outcome:
      validateInterviewOutcome(
        outcome
      ),

    feedback:
      cleanText(
        feedback
      ),

    completedAt:
      now(),
  };

  if (notes !== undefined) {
    $set.notes =
      cleanText(
        notes
      );
  }

  const updated =
    await InterviewModel
      .findOneAndUpdate(
        {
          _id:
            current
              .interviewObjectId,

          applicantId:
            current
              .target
              .applicantObjectId,

          status:
            'scheduled',

          archived: {
            $ne: true,
          },
        },

        {
          $set,
        },

        {
          new: true,
          runValidators: true,
        }
      );

  if (!updated) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Interview changed before completion could be recorded.'
    );
  }

  return updated;
}


async function cancelApplicantInterview({
  applicantId,
  interviewId,
  reason = '',

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  syncInterviewMeeting =
    cancelInterviewMeeting,

  notifyInterview =
    sendApplicantInterviewNotification,

  notificationTransporter =
    null,

  notificationLogger =
    console,

  now =
    () => new Date(),
}) {
  const current =
    await getActiveInterview({
      applicantId,
      interviewId,
      ApplicantModel,
      InterviewModel,
    });

  if (
    current.interview.status !==
      'scheduled'
  ) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Only a scheduled interview can be cancelled.'
    );
  }

  const updated =
    await InterviewModel
      .findOneAndUpdate(
        {
          _id:
            current
              .interviewObjectId,

          applicantId:
            current
              .target
              .applicantObjectId,

          status:
            'scheduled',

          archived: {
            $ne: true,
          },
        },

        {
          $set: {
            status:
              'cancelled',

            cancelledAt:
              now(),

            cancellationReason:
              cleanText(
                reason
              ),
          },
        },

        {
          new: true,
          runValidators: true,
        }
      );

  if (!updated) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Interview changed before cancellation could be recorded.'
    );
  }

  /*
   * OMAH remains the source of truth.
   *
   * Record the cancellation locally first,
   * then remove the synchronized provider
   * event using its existing providerEventId.
   */
  const syncedInterview =
    await syncInterviewMeeting({
      interview:
        updated,

      InterviewModel,
    });

  try {
    await notifyInterview({
      interview:
        syncedInterview,

      applicant:
        current
          .target
          .applicant,

      eventType:
        'cancelled',

      transporter:
        notificationTransporter,

      logger:
        notificationLogger,
    });
  } catch (error) {
    notificationLogger
      ?.error?.(
        'Interview notification failed after cancellation:',
        error?.message ||
          error
      );
  }

  return syncedInterview;
}


async function markApplicantInterviewNoShow({
  applicantId,
  interviewId,
  notes,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  now =
    () => new Date(),
}) {
  const current =
    await getActiveInterview({
      applicantId,
      interviewId,
      ApplicantModel,
      InterviewModel,
    });

  if (
    current.interview.status !==
      'scheduled'
  ) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Only a scheduled interview can be marked as no-show.'
    );
  }

  const $set = {
    status:
      'no_show',

    completedAt:
      now(),
  };

  if (notes !== undefined) {
    $set.notes =
      cleanText(
        notes
      );
  }

  const updated =
    await InterviewModel
      .findOneAndUpdate(
        {
          _id:
            current
              .interviewObjectId,

          applicantId:
            current
              .target
              .applicantObjectId,

          status:
            'scheduled',

          archived: {
            $ne: true,
          },
        },

        {
          $set,
        },

        {
          new: true,
          runValidators: true,
        }
      );

  if (!updated) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Interview changed before no-show could be recorded.'
    );
  }

  return updated;
}


async function archiveApplicantInterview({
  applicantId,
  interviewId,
  archivedBy,
  reason = '',

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  now =
    () => new Date(),
}) {
  const current =
    await getActiveInterview({
      applicantId,
      interviewId,
      ApplicantModel,
      InterviewModel,
    });

  const actor =
    cleanText(
      archivedBy
    );

  if (!actor) {
    throw serviceError(
      'INTERVIEW_ARCHIVE_ACTOR_REQUIRED',

      'Interview archive actor is required.'
    );
  }

  const updated =
    await InterviewModel
      .findOneAndUpdate(
        {
          _id:
            current
              .interviewObjectId,

          applicantId:
            current
              .target
              .applicantObjectId,

          archived: {
            $ne: true,
          },
        },

        {
          $set: {
            archived: true,

            archivedAt:
              now(),

            archivedBy:
              actor,

            archiveReason:
              cleanText(
                reason
              ),
          },
        },

        {
          new: true,
          runValidators: true,
        }
      );

  if (!updated) {
    throw serviceError(
      'INTERVIEW_STATUS_CONFLICT',

      'Interview changed before it could be archived.'
    );
  }

  return updated;
}



async function permanentlyDeleteApplicantInterview({
  applicantId,
  interviewId,

  ApplicantModel =
    Applicant,

  InterviewModel =
    ApplicantInterview,

  syncInterviewMeeting =
    cancelInterviewMeeting,
}) {
  const target =
    await requireApplicant({
      applicantId,
      ApplicantModel,
    });

  const interviewObjectId =
    toObjectId(
      interviewId,
      'interviewId'
    );

  const interview =
    await InterviewModel.findOne({
      _id:
        interviewObjectId,

      applicantId:
        target
          .applicantObjectId,
    });

  if (!interview) {
    throw serviceError(
      'INTERVIEW_NOT_FOUND',

      'Interview was not found.'
    );
  }


  /*
   * Hard deletion is deliberately limited
   * to records that are already cancelled
   * or explicitly archived.
   */
  if (
    interview.status !==
      'cancelled' &&
    interview.archived !==
      true
  ) {
    throw serviceError(
      'INTERVIEW_PERMANENT_DELETE_NOT_ALLOWED',

      'Only cancelled or archived interviews can be permanently deleted.'
    );
  }


  let safeInterview =
    interview;

  const format =
    cleanText(
      interview.format
    ).toLowerCase();

  const providerEventId =
    cleanText(
      interview
        ?.meeting
        ?.providerEventId
    );

  const meetingStatus =
    cleanText(
      interview
        ?.meeting
        ?.status
    ).toLowerCase();


  /*
   * Never hard-delete a record while an
   * external online event may still exist.
   *
   * This also protects archived scheduled
   * interviews from leaving orphaned
   * Google Calendar events.
   */
  const needsProviderCleanup =
    format === 'online' &&
    Boolean(
      providerEventId
    ) &&
    meetingStatus !==
      'cancelled';

  if (needsProviderCleanup) {
    safeInterview =
      await syncInterviewMeeting({
        interview,
        InterviewModel,
      });

    const cleanupStatus =
      cleanText(
        safeInterview
          ?.meeting
          ?.status
      ).toLowerCase();

    if (
      cleanupStatus !==
        'cancelled'
    ) {
      throw serviceError(
        'INTERVIEW_PERMANENT_DELETE_PROVIDER_CLEANUP_FAILED',

        'The external interview meeting could not be safely removed. Permanent deletion was blocked.'
      );
    }
  }


  const deleted =
    await InterviewModel
      .findOneAndDelete({
        _id:
          interviewObjectId,

        applicantId:
          target
            .applicantObjectId,
      });

  if (!deleted) {
    throw serviceError(
      'INTERVIEW_PERMANENT_DELETE_CONFLICT',

      'Interview changed before it could be permanently deleted.'
    );
  }


  return {
    deleted:
      true,

    interviewId:
      String(
        interviewObjectId
      ),
  };
}



module.exports = {
  validateInterviewMeetingProvider,
  normalizeActor,
  normalizeParticipants,
  buildInterviewScheduleData,
  buildInterviewAuditChanges,
  createApplicantInterview,
  listApplicantInterviews,
  updateApplicantInterview,
  completeApplicantInterview,
  cancelApplicantInterview,
  markApplicantInterviewNoShow,
  archiveApplicantInterview,
  permanentlyDeleteApplicantInterview,
};

