'use strict';

const Applicant =
  require('../models/Applicant');

const ApplicantFormSubmission =
  require('../models/ApplicantFormSubmission');

const ApplicantEvaluation =
  require('../models/ApplicantEvaluation');

const ApplicantInterview =
  require('../models/ApplicantInterview');

const ApplicantActivity =
  require('../models/ApplicantActivity');

const {
  toObjectId,
} = require(
  './applicantSubmissionService'
);

const {
  normalizeActor,
} = require(
  './applicantActivityService'
);


function timelineError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}


function cleanText(value) {
  return String(
    value ?? ''
  ).trim();
}


function idString(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value);
}


function validDate(value) {
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


function buildTimelineEvent({
  id,
  type,
  category,
  title,
  description = '',
  occurredAt,
  actor = {},
  source = {},
  metadata = {},
}) {
  const date =
    validDate(
      occurredAt
    );

  if (!date) {
    return null;
  }

  return {
    id:
      cleanText(id),

    type:
      cleanText(type),

    category:
      cleanText(category),

    title:
      cleanText(title),

    description:
      cleanText(
        description
      ),

    occurredAt:
      date,

    actor:
      normalizeActor(
        actor
      ),

    source: {
      type:
        cleanText(
          source.type
        ),

      id:
        cleanText(
          source.id
        ),
    },

    metadata:
      (
        metadata &&
        typeof metadata ===
          'object' &&
        !Array.isArray(
          metadata
        )
      )
        ? metadata
        : {},
  };
}


function applicantEvents(
  applicant
) {
  const sourceId =
    idString(
      applicant?._id
    );

  const created =
    buildTimelineEvent({
      id:
        `applicant:${sourceId}:created`,

      type:
        'applicant.created',

      category:
        'lifecycle',

      title:
        'Applicant created',

      description:
        'Master Applicant profile created.',

      occurredAt:
        applicant?.createdAt,

      source: {
        type:
          'applicant',

        id:
          sourceId,
      },

      metadata: {
        initialStatus:
          cleanText(
            applicant
              ?.recruitment
              ?.status
          ),

        source:
          cleanText(
            applicant
              ?.recruitment
              ?.source
          ),
      },
    });

  return created
    ? [created]
    : [];
}


function submissionEvents(
  submission
) {
  const sourceId =
    idString(
      submission?._id
    );

  const occurredAt =
    submission?.submittedAt ||
    submission?.createdAt;

  const event =
    buildTimelineEvent({
      id:
        `submission:${sourceId}:created`,

      type:
        'submission.created',

      category:
        'submission',

      title:
        'Application submitted',

      description:
        submission?.source
          ? `Source: ${submission.source}`
          : '',

      occurredAt,

      source: {
        type:
          'submission',

        id:
          sourceId,
      },

      metadata: {
        submissionKey:
          cleanText(
            submission
              ?.submissionKey
          ),

        source:
          cleanText(
            submission
              ?.source
          ),
      },
    });

  return event
    ? [event]
    : [];
}


function evaluationEvents(
  evaluation
) {
  const events = [];

  const sourceId =
    idString(
      evaluation?._id
    );

  const evaluator =
    evaluation?.evaluator ||
    {};


  const created =
    buildTimelineEvent({
      id:
        `evaluation:${sourceId}:created`,

      type:
        'evaluation.created',

      category:
        'evaluation',

      title:
        'Evaluation created',

      occurredAt:
        evaluation?.createdAt,

      actor:
        evaluator,

      source: {
        type:
          'evaluation',

        id:
          sourceId,
      },

      metadata: {
        status:
          cleanText(
            evaluation?.status
          ),

        recommendation:
          cleanText(
            evaluation
              ?.recommendation
          ),

        weightedScore:
          evaluation
            ?.weightedScore ??
          null,
      },
    });

  if (created) {
    events.push(
      created
    );
  }


  const submitted =
    buildTimelineEvent({
      id:
        `evaluation:${sourceId}:submitted`,

      type:
        'evaluation.submitted',

      category:
        'evaluation',

      title:
        'Evaluation submitted',

      occurredAt:
        evaluation
          ?.submittedAt,

      actor:
        evaluator,

      source: {
        type:
          'evaluation',

        id:
          sourceId,
      },
    });

  if (submitted) {
    events.push(
      submitted
    );
  }


  const reopened =
    buildTimelineEvent({
      id:
        `evaluation:${sourceId}:reopened`,

      type:
        'evaluation.reopened',

      category:
        'evaluation',

      title:
        'Evaluation reopened',

      occurredAt:
        evaluation
          ?.reopenedAt,

      actor: {
        userId:
          evaluation
            ?.reopenedBy,
      },

      source: {
        type:
          'evaluation',

        id:
          sourceId,
      },
    });

  if (reopened) {
    events.push(
      reopened
    );
  }


  const archived =
    buildTimelineEvent({
      id:
        `evaluation:${sourceId}:archived`,

      type:
        'evaluation.archived',

      category:
        'evaluation',

      title:
        'Evaluation archived',

      description:
        evaluation
          ?.archiveReason,

      occurredAt:
        evaluation
          ?.archivedAt,

      actor: {
        userId:
          evaluation
            ?.archivedBy,
      },

      source: {
        type:
          'evaluation',

        id:
          sourceId,
      },
    });

  if (archived) {
    events.push(
      archived
    );
  }

  return events;
}


function interviewEvents(
  interview
) {
  const events = [];

  const sourceId =
    idString(
      interview?._id
    );

  const actor =
    interview?.createdBy ||
    interview?.organizer ||
    {};


  const scheduled =
    buildTimelineEvent({
      id:
        `interview:${sourceId}:scheduled`,

      type:
        'interview.scheduled',

      category:
        'interview',

      title:
        'Interview scheduled',

      occurredAt:
        interview?.createdAt,

      actor,

      source: {
        type:
          'interview',

        id:
          sourceId,
      },

      metadata: {
        interviewType:
          cleanText(
            interview?.type
          ),

        format:
          cleanText(
            interview?.format
          ),

        status:
          cleanText(
            interview?.status
          ),

        scheduledStart:
          validDate(
            interview
              ?.scheduledStart
          ),

        scheduledEnd:
          validDate(
            interview
              ?.scheduledEnd
          ),

        outcome:
          cleanText(
            interview?.outcome
          ),
      },
    });

  if (scheduled) {
    events.push(
      scheduled
    );
  }


  const completed =
    buildTimelineEvent({
      id:
        `interview:${sourceId}:completed`,

      type:
        'interview.completed',

      category:
        'interview',

      title:
        'Interview completed',

      occurredAt:
        interview
          ?.completedAt,

      /*
       * Historical Interview records do not
       * preserve the actor who completed the
       * Interview. Do not infer createdBy or
       * organizer as the lifecycle actor.
       */
      actor: {},

      source: {
        type:
          'interview',

        id:
          sourceId,
      },

      metadata: {
        outcome:
          cleanText(
            interview?.outcome
          ),
      },
    });

  if (completed) {
    events.push(
      completed
    );
  }


  const cancelled =
    buildTimelineEvent({
      id:
        `interview:${sourceId}:cancelled`,

      type:
        'interview.cancelled',

      category:
        'interview',

      title:
        'Interview cancelled',

      description:
        interview
          ?.cancellationReason,

      occurredAt:
        interview
          ?.cancelledAt,

      /*
       * Historical Interview records do not
       * preserve the actor who cancelled the
       * Interview.
       */
      actor: {},

      source: {
        type:
          'interview',

        id:
          sourceId,
      },
    });

  if (cancelled) {
    events.push(
      cancelled
    );
  }


  const archived =
    buildTimelineEvent({
      id:
        `interview:${sourceId}:archived`,

      type:
        'interview.archived',

      category:
        'interview',

      title:
        'Interview archived',

      description:
        interview
          ?.archiveReason,

      occurredAt:
        interview
          ?.archivedAt,

      actor: {
        userId:
          interview
            ?.archivedBy,
      },

      source: {
        type:
          'interview',

        id:
          sourceId,
      },
    });

  if (archived) {
    events.push(
      archived
    );
  }

  return events;
}


function storedActivityEvent(
  activity
) {
  return buildTimelineEvent({
    id:
      `activity:${idString(
        activity?._id
      )}`,

    type:
      activity?.type,

    category:
      activity?.category,

    title:
      activity?.title,

    description:
      activity?.description,

    occurredAt:
      activity?.occurredAt,

    actor:
      activity?.actor,

    source:
      activity?.source,

    metadata:
      activity?.metadata,
  });
}


function sortTimelineEvents(
  events
) {
  return [...events]
    .sort(
      (
        left,
        right
      ) => {
        const timeDifference =
          right
            .occurredAt
            .getTime() -
          left
            .occurredAt
            .getTime();

        if (timeDifference) {
          return timeDifference;
        }

        return right.id
          .localeCompare(
            left.id
          );
      }
    );
}


function normalizeLimit(value) {
  const parsed =
    Number.parseInt(
      String(value ?? ''),
      10
    );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return 100;
  }

  return Math.min(
    Math.max(
      parsed,
      1
    ),
    500
  );
}


async function getApplicantTimeline({
  applicantId,
  category = '',
  type = '',
  limit = 100,

  ApplicantModel =
    Applicant,

  SubmissionModel =
    ApplicantFormSubmission,

  EvaluationModel =
    ApplicantEvaluation,

  InterviewModel =
    ApplicantInterview,

  ActivityModel =
    ApplicantActivity,
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
    throw timelineError(
      'APPLICANT_NOT_FOUND',
      'Applicant was not found.'
    );
  }


  const [
    submissions,
    evaluations,
    interviews,
    activities,
  ] =
    await Promise.all([
      SubmissionModel
        .find({
          applicantId:
            applicantObjectId,
        })
        .sort({
          submittedAt: -1,
          createdAt: -1,
        }),

      /*
       * Timeline deliberately includes archived
       * evaluations so lifecycle events remain
       * visible for audit purposes.
       */
      EvaluationModel
        .find({
          applicantId:
            applicantObjectId,
        })
        .sort({
          createdAt: -1,
        }),

      /*
       * Timeline deliberately includes archived
       * interviews.
       */
      InterviewModel
        .find({
          applicantId:
            applicantObjectId,
        })
        .sort({
          createdAt: -1,
        }),

      ActivityModel
        .find({
          applicantId:
            applicantObjectId,
        })
        .sort({
          occurredAt: -1,
          _id: -1,
        }),
    ]);


  let events = [
    ...applicantEvents(
      applicant
    ),

    ...submissions.flatMap(
      submissionEvents
    ),

    ...evaluations.flatMap(
      evaluationEvents
    ),

    ...interviews.flatMap(
      interviewEvents
    ),

    ...activities
      .map(
        storedActivityEvent
      )
      .filter(Boolean),
  ];


  const categoryFilter =
    cleanText(category);

  if (categoryFilter) {
    events =
      events.filter(
        (event) =>
          event.category ===
          categoryFilter
      );
  }


  const typeFilter =
    cleanText(type);

  if (typeFilter) {
    events =
      events.filter(
        (event) =>
          event.type ===
          typeFilter
      );
  }


  const sorted =
    sortTimelineEvents(
      events
    );

  const boundedLimit =
    normalizeLimit(
      limit
    );


  return {
    events:
      sorted.slice(
        0,
        boundedLimit
      ),

    total:
      sorted.length,

    limit:
      boundedLimit,

    filters: {
      category:
        categoryFilter,

      type:
        typeFilter,
    },
  };
}


module.exports = {
  cleanText,
  validDate,
  buildTimelineEvent,
  applicantEvents,
  submissionEvents,
  evaluationEvents,
  interviewEvents,
  storedActivityEvent,
  sortTimelineEvents,
  normalizeLimit,
  getApplicantTimeline,
};
