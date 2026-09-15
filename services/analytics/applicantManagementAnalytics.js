'use strict';

const {
  DUPLICATE_CASE_STATUSES,
  DUPLICATE_CASE_DECISIONS,
  DUPLICATE_CONFIDENCE_LEVELS,
} = require(
  '../../models/ApplicantDuplicateCase'
);

const ApplicantDocument =
  require(
    '../../models/ApplicantDocument'
  );

const {
  percentage,
  average,
  fixedBreakdown,
  rankedBreakdown,
  monthlySeries,
  monthKey,
  text,
} = require(
  './applicantAnalyticsHelpers'
);


const {
  DOCUMENT_TYPES,
  DOCUMENT_SOURCES,
} = ApplicantDocument;


/*
 * Historical submission statuses.
 *
 * These belong ONLY to immutable
 * ApplicantFormSubmission records.
 *
 * They must never be mixed with the
 * seven-stage master Applicant pipeline.
 */
const SUBMISSION_STATUSES = [
  'applied',
  'reviewing',
  'shortlisted',
  'interview',
  'accepted',
  'rejected',
  'withdrawn',
];


const SUBMISSION_SOURCES = [
  'google-form',
  'manual',
  'api',
];


/*
 * Transparent Applicant data-quality
 * definition.
 *
 * This is intentionally explicit rather
 * than pretending an existing hidden
 * profile-completion score exists.
 */
const PROFILE_QUALITY_FIELDS = [
  {
    key:
      'email',

    label:
      'Email',

    present:
      applicant =>
        Boolean(
          text(
            applicant
              ?.email ||
            applicant
              ?.identity
              ?.email
          )
        ),
  },

  {
    key:
      'phone',

    label:
      'Phone',

    present:
      applicant =>
        Boolean(
          text(
            applicant
              ?.phoneNumber ||
            applicant
              ?.identity
              ?.phoneNumber
          )
        ),
  },

  {
    key:
      'country',

    label:
      'Country',

    present:
      applicant =>
        Boolean(
          text(
            applicant
              ?.identity
              ?.country
          )
        ),
  },

  {
    key:
      'city',

    label:
      'City',

    present:
      applicant =>
        Boolean(
          text(
            applicant
              ?.identity
              ?.city
          )
        ),
  },

  {
    key:
      'positionTrack',

    label:
      'Position Track',

    present:
      applicant =>
        Boolean(
          text(
            applicant
              ?.preferences
              ?.positionTrack
          )
        ),
  },

  {
    key:
      'university',

    label:
      'University',

    present:
      applicant =>
        Boolean(
          text(
            applicant
              ?.education
              ?.universityName
          )
        ),
  },

  {
    key:
      'degreeLevel',

    label:
      'Degree Level',

    present:
      applicant =>
        Boolean(
          text(
            applicant
              ?.education
              ?.degreeLevel
          )
        ),
  },

  {
    key:
      'technicalSkills',

    label:
      'Technical Skills',

    present:
      applicant =>
        Array.isArray(
          applicant
            ?.skills
            ?.primaryTechnical
        ) &&
        applicant
          .skills
          .primaryTechnical
          .length >
        0,
  },
];


function idOf(
  value
) {
  return String(
    value ?? ''
  );
}


function validDate(
  value
) {
  const date =
    value
      ? new Date(value)
      : null;

  return (
    date &&
    !Number.isNaN(
      date.getTime()
    )
  )
    ? date
    : null;
}


function descendingDate(
  left,
  right,
  getDate
) {
  const a =
    validDate(
      getDate(left)
    )?.getTime() ||
    0;

  const b =
    validDate(
      getDate(right)
    )?.getTime() ||
    0;

  return b - a;
}


function applicantLookup(
  applicants
) {
  return new Map(
    applicants.map(
      applicant => [
        idOf(
          applicant._id
        ),

        applicant,
      ]
    )
  );
}


function applicantLabel(
  applicant
) {
  return (
    text(
      applicant
        ?.fullName ||
      applicant
        ?.identity
        ?.fullName
    ) ||
    text(
      applicant
        ?.applicantCode
    ) ||
    'Applicant'
  );
}


function buildCvApplicantIds({
  documents = [],
  submissions = [],
} = {}) {
  const ids =
    new Set(
      documents
        .filter(
          document =>
            document
              ?.lifecycle
              ?.archived !==
              true &&
            document
              ?.isCurrent !==
              false &&
            document
              ?.documentType ===
              'cv'
        )
        .map(
          document =>
            idOf(
              document
                .applicantId
            )
        )
        .filter(Boolean)
    );


  for (
    const submission
    of submissions
  ) {
    if (
      !text(
        submission
          ?.documents
          ?.cvResume
      )
    ) {
      continue;
    }

    const applicantId =
      idOf(
        submission
          ?.applicantId
      );

    if (applicantId) {
      ids.add(
        applicantId
      );
    }
  }


  return ids;
}


function buildDataQuality({
  applicants = [],
  documents = [],
  submissions = [],
} = {}) {
  const cvApplicantIds =
    buildCvApplicantIds({
      documents,
      submissions,
    });


  const fields =
    PROFILE_QUALITY_FIELDS
      .map(
        definition => {
          const missing =
            applicants.filter(
              applicant =>
                !definition
                  .present(
                    applicant
                  )
            ).length;

          return {
            key:
              definition.key,

            label:
              definition.label,

            missing,

            present:
              applicants.length -
              missing,

            coveragePercent:
              percentage(
                applicants.length -
                  missing,
                applicants.length
              ),
          };
        }
      );


  const incompleteApplicants =
    applicants.filter(
      applicant =>
        PROFILE_QUALITY_FIELDS
          .some(
            definition =>
              !definition
                .present(
                  applicant
                )
          )
    );


  const totalChecks =
    applicants.length *
    PROFILE_QUALITY_FIELDS
      .length;


  const passedChecks =
    fields.reduce(
      (
        sum,
        field
      ) =>
        sum +
        field.present,
      0
    );


  const applicantsWithCv =
    applicants.filter(
      applicant =>
        cvApplicantIds.has(
          idOf(
            applicant._id
          )
        )
    ).length;


  return {
    definition:
      PROFILE_QUALITY_FIELDS
        .map(
          field => ({
            key:
              field.key,

            label:
              field.label,
          })
        ),

    fields,

    profileFieldCoveragePercent:
      percentage(
        passedChecks,
        totalChecks
      ),

    completeProfiles:
      applicants.length -
      incompleteApplicants.length,

    incompleteProfiles:
      incompleteApplicants.length,

    cvCoverage: {
      applicantsWithCv,

      applicantsMissingCv:
        applicants.length -
        applicantsWithCv,

      coveragePercent:
        percentage(
          applicantsWithCv,
          applicants.length
        ),
    },
  };
}


function buildDuplicateAnalytics(
  duplicateCases = []
) {
  const unresolved =
    duplicateCases.filter(
      duplicate =>
        duplicate
          ?.status !==
        'resolved'
    );


  const highConfidenceUnresolved =
    unresolved.filter(
      duplicate =>
        duplicate
          ?.confidence ===
        'high'
    ).length;


  return {
    total:
      duplicateCases.length,

    unresolved:
      unresolved.length,

    highConfidenceUnresolved,

    statuses:
      fixedBreakdown({
        records:
          duplicateCases,

        keys:
          DUPLICATE_CASE_STATUSES,

        getKey:
          duplicate =>
            duplicate.status,
      }),

    confidence:
      fixedBreakdown({
        records:
          duplicateCases,

        keys:
          DUPLICATE_CONFIDENCE_LEVELS,

        getKey:
          duplicate =>
            duplicate.confidence,
      }),

    decisions:
      fixedBreakdown({
        records:
          duplicateCases,

        keys:
          DUPLICATE_CASE_DECISIONS,

        getKey:
          duplicate =>
            duplicate
              ?.resolution
              ?.decision ||
            'pending',
      }),

    recentUnresolved:
      unresolved
        .slice()
        .sort(
          (
            left,
            right
          ) =>
            descendingDate(
              left,
              right,
              duplicate =>
                duplicate
                  .detectedAt ||
                duplicate
                  .createdAt
            )
        )
        .slice(
          0,
          10
        )
        .map(
          duplicate => ({
            id:
              idOf(
                duplicate._id
              ),

            sourceApplicantId:
              idOf(
                duplicate
                  .sourceApplicantId
              ),

            candidateApplicantId:
              idOf(
                duplicate
                  .candidateApplicantId
              ),

            status:
              duplicate.status,

            confidence:
              duplicate.confidence,

            strongMatchCount:
              Number(
                duplicate
                  .strongMatchCount ||
                0
              ),

            matchedSignals:
              duplicate
                .matchedSignals ||
              [],

            detectedAt:
              duplicate
                .detectedAt ||
              duplicate
                .createdAt ||
              null,
          })
        ),
  };
}


function buildSubmissionAnalytics(
  submissions = []
) {
  const byApplicant =
    new Map();


  for (
    const submission of submissions
  ) {
    const applicantId =
      idOf(
        submission
          ?.applicantId
      );

    if (!applicantId) {
      continue;
    }

    byApplicant.set(
      applicantId,
      (
        byApplicant.get(
          applicantId
        ) ||
        0
      ) + 1
    );
  }


  const counts =
    [
      ...byApplicant.values(),
    ];


  return {
    total:
      submissions.length,

    applicantsWithSubmissions:
      byApplicant.size,

    applicantsWithMultipleSubmissions:
      counts.filter(
        count =>
          count >
          1
      ).length,

    averageSubmissionsPerApplicant:
      average(
        counts
      ) ||
      0,

    sources:
      fixedBreakdown({
        records:
          submissions,

        keys:
          SUBMISSION_SOURCES,

        getKey:
          submission =>
            submission.source,
      }),

    historicalStatuses:
      fixedBreakdown({
        records:
          submissions,

        keys:
          SUBMISSION_STATUSES,

        getKey:
          submission =>
            submission
              ?.recruitment
              ?.status,
      }),

    trend:
      monthlySeries({
        records:
          submissions,

        getDate:
          submission =>
            submission
              .submittedAt ||
            submission
              .createdAt,
      }),
  };
}


function buildDocumentAnalytics({
  applicants = [],
  documents = [],
  submissions = [],
} = {}) {
  const currentActive =
    documents.filter(
      document =>
        document
          ?.isCurrent !==
          false &&
        document
          ?.lifecycle
          ?.archived !==
          true
    );


  const archived =
    documents.filter(
      document =>
        document
          ?.lifecycle
          ?.archived ===
        true
    );


  const currentCvIds =
    buildCvApplicantIds({
      documents,
      submissions,
    });


  return {
    totalVersions:
      documents.length,

    currentActive:
      currentActive.length,

    archived:
      archived.length,

    applicantsWithCv:
      applicants.filter(
        applicant =>
          currentCvIds.has(
            idOf(
              applicant._id
            )
          )
      ).length,

    applicantsMissingCv:
      applicants.filter(
        applicant =>
          !currentCvIds.has(
            idOf(
              applicant._id
            )
          )
      ).length,

    cvCoveragePercent:
      percentage(
        applicants.filter(
          applicant =>
            currentCvIds.has(
              idOf(
                applicant._id
              )
            )
        ).length,
        applicants.length
      ),

    types:
      fixedBreakdown({
        records:
          currentActive,

        keys:
          DOCUMENT_TYPES,

        getKey:
          document =>
            document
              .documentType,
      }),

    sources:
      fixedBreakdown({
        records:
          currentActive,

        keys:
          DOCUMENT_SOURCES,

        getKey:
          document =>
            document.source,
      }),

    trend:
      monthlySeries({
        records:
          currentActive,

        getDate:
          document =>
            document
              .uploadedAt ||
            document
              .createdAt,
      }),
  };
}


function buildRecentFeedback({
  applicants = [],
  evaluations = [],
} = {}) {
  const applicantsById =
    applicantLookup(
      applicants
    );


  return evaluations
    .filter(
      evaluation =>
        evaluation
          ?.status ===
        'submitted'
    )
    .slice()
    .sort(
      (
        left,
        right
      ) =>
        descendingDate(
          left,
          right,
          evaluation =>
            evaluation
              .submittedAt ||
            evaluation
              .createdAt
        )
    )
    .slice(
      0,
      12
    )
    .map(
      evaluation => {
        const applicant =
          applicantsById.get(
            idOf(
              evaluation
                .applicantId
            )
          );

        return {
          id:
            idOf(
              evaluation._id
            ),

          applicantId:
            idOf(
              evaluation
                .applicantId
            ),

          applicantName:
            applicantLabel(
              applicant
            ),

          evaluator:
            {
              name:
                text(
                  evaluation
                    ?.evaluator
                    ?.name
                ),

              role:
                text(
                  evaluation
                    ?.evaluator
                    ?.role
                ),
            },

          recommendation:
            evaluation
              .recommendation,

          averageRating:
            evaluation
              .averageRating,

          weightedScore:
            evaluation
              .weightedScore,

          strengths:
            text(
              evaluation
                .strengths
            ),

          concerns:
            text(
              evaluation
                .concerns
            ),

          summary:
            text(
              evaluation
                .summary
            ),

          submittedAt:
            evaluation
              .submittedAt ||
            evaluation
              .createdAt ||
            null,
        };
      }
    );
}


function buildCommunicationAnalytics(
  activities = []
) {
  const communications =
    activities.filter(
      activity =>
        [
          'communication.email.sent',
          'communication.whatsapp.sent',
        ].includes(
          activity
            ?.type
        )
    );


  const emailSent =
    communications.filter(
      activity =>
        activity.type ===
        'communication.email.sent'
    ).length;


  const whatsappSent =
    communications.filter(
      activity =>
        activity.type ===
        'communication.whatsapp.sent'
    ).length;


  const trendMap =
    new Map();


  for (
    const activity of communications
  ) {
    const period =
      monthKey(
        activity
          .occurredAt
      );

    if (!period) {
      continue;
    }

    if (
      !trendMap.has(
        period
      )
    ) {
      trendMap.set(
        period,
        {
          period,

          email: 0,
          whatsapp: 0,
          total: 0,
        }
      );
    }


    const row =
      trendMap.get(
        period
      );

    if (
      activity.type ===
      'communication.email.sent'
    ) {
      row.email +=
        1;
    }

    if (
      activity.type ===
      'communication.whatsapp.sent'
    ) {
      row.whatsapp +=
        1;
    }

    row.total +=
      1;
  }


  return {
    total:
      communications.length,

    emailSent,

    whatsappSent,

    trend:
      [
        ...trendMap.values(),
      ].sort(
        (a, b) =>
          a.period.localeCompare(
            b.period
          )
      ),

    recent:
      communications
        .slice()
        .sort(
          (
            left,
            right
          ) =>
            descendingDate(
              left,
              right,
              activity =>
                activity
                  .occurredAt
            )
        )
        .slice(
          0,
          12
        )
        .map(
          activity => ({
            id:
              idOf(
                activity._id
              ),

            applicantId:
              idOf(
                activity
                  .applicantId
              ),

            type:
              activity.type,

            title:
              text(
                activity.title
              ),

            occurredAt:
              activity.occurredAt,

            actor:
              {
                name:
                  text(
                    activity
                      ?.actor
                      ?.name
                  ),

                role:
                  text(
                    activity
                      ?.actor
                      ?.role
                  ),
              },

            subject:
              text(
                activity
                  ?.metadata
                  ?.subject
              ),

            provider:
              text(
                activity
                  ?.metadata
                  ?.provider
              ),
          })
        ),
  };
}


function buildRecentActivity(
  activities = []
) {
  return activities
    .slice()
    .sort(
      (
        left,
        right
      ) =>
        descendingDate(
          left,
          right,
          activity =>
            activity
              .occurredAt
        )
    )
    .slice(
      0,
      20
    )
    .map(
      activity => ({
        id:
          idOf(
            activity._id
          ),

        applicantId:
          idOf(
            activity
              .applicantId
          ),

        type:
          activity.type,

        category:
          activity.category,

        title:
          text(
            activity.title
          ),

        description:
          text(
            activity.description
          ),

        occurredAt:
          activity
            .occurredAt,

        actor:
          {
            name:
              text(
                activity
                  ?.actor
                  ?.name
              ),

            role:
              text(
                activity
                  ?.actor
                  ?.role
              ),
          },
      })
    );
}


function buildUpcomingInterviews({
  applicants = [],
  interviews = [],
  now = new Date(),
  days = 7,
} = {}) {
  const applicantsById =
    applicantLookup(
      applicants
    );


  const start =
    new Date(
      now
    );


  const end =
    new Date(
      start.getTime() +
      days *
        24 *
        60 *
        60 *
        1000
    );


  return interviews
    .filter(
      interview => {
        const scheduled =
          validDate(
            interview
              .scheduledStart
          );

        return (
          interview
            ?.status ===
            'scheduled' &&
          scheduled &&
          scheduled >=
            start &&
          scheduled <=
            end
        );
      }
    )
    .sort(
      (
        left,
        right
      ) => {
        const a =
          validDate(
            left
              .scheduledStart
          )?.getTime() ||
          0;

        const b =
          validDate(
            right
              .scheduledStart
          )?.getTime() ||
          0;

        return a - b;
      }
    )
    .slice(
      0,
      20
    )
    .map(
      interview => {
        const applicant =
          applicantsById.get(
            idOf(
              interview
                .applicantId
            )
          );

        return {
          id:
            idOf(
              interview._id
            ),

          applicantId:
            idOf(
              interview
                .applicantId
            ),

          applicantName:
            applicantLabel(
              applicant
            ),

          type:
            interview.type,

          format:
            interview.format,

          status:
            interview.status,

          outcome:
            interview.outcome,

          scheduledStart:
            interview
              .scheduledStart,

          scheduledEnd:
            interview
              .scheduledEnd,

          organizer:
            {
              name:
                text(
                  interview
                    ?.organizer
                    ?.name
                ),

              role:
                text(
                  interview
                    ?.organizer
                    ?.role
                ),
            },
        };
      }
    );
}


function buildActionCenter({
  applicants = [],
  evaluations = [],
  interviews = [],
  duplicateCases = [],
  documents = [],
  submissions = [],
  now = new Date(),
} = {}) {
  const dataQuality =
    buildDataQuality({
      applicants,
      documents,
      submissions,
    });


  const upcomingInterviews =
    buildUpcomingInterviews({
      applicants,
      interviews,
      now,
      days: 7,
    });


  const overdueScheduledInterviews =
    interviews.filter(
      interview => {
        const scheduled =
          validDate(
            interview
              .scheduledStart
          );

        return (
          interview
            ?.status ===
            'scheduled' &&
          scheduled &&
          scheduled <
            now
        );
      }
    ).length;


  const evaluatedApplicants =
    new Set(
      evaluations
        .filter(
          evaluation =>
            evaluation
              ?.status ===
            'submitted'
        )
        .map(
          evaluation =>
            idOf(
              evaluation
                .applicantId
            )
        )
    );


  const interviewedApplicants =
    new Set(
      interviews.map(
        interview =>
          idOf(
            interview
              .applicantId
          )
      )
    );


  return {
    newNeedingReview:
      applicants.filter(
        applicant =>
          applicant
            ?.recruitment
            ?.status ===
          'applied'
      ).length,

    draftEvaluations:
      evaluations.filter(
        evaluation =>
          evaluation
            ?.status ===
          'draft'
      ).length,

    upcomingInterviews:
      upcomingInterviews.length,

    upcomingInterviewWindowDays:
      7,

    overdueScheduledInterviews,

    interviewNoShows:
      interviews.filter(
        interview =>
          interview
            ?.status ===
          'no_show'
      ).length,

    awaitingOfferDecision:
      applicants.filter(
        applicant =>
          applicant
            ?.recruitment
            ?.status ===
          'offered'
      ).length,

    unresolvedDuplicateCases:
      duplicateCases.filter(
        duplicate =>
          duplicate
            ?.status !==
          'resolved'
      ).length,

    highConfidenceDuplicateCases:
      duplicateCases.filter(
        duplicate =>
          duplicate
            ?.status !==
            'resolved' &&
          duplicate
            ?.confidence ===
            'high'
      ).length,

    incompleteProfiles:
      dataQuality
        .incompleteProfiles,

    applicantsMissingCv:
      dataQuality
        .cvCoverage
        .applicantsMissingCv,

    applicantsWithoutSubmittedEvaluation:
      applicants.filter(
        applicant =>
          !evaluatedApplicants.has(
            idOf(
              applicant._id
            )
          )
      ).length,

    applicantsWithoutInterview:
      applicants.filter(
        applicant =>
          !interviewedApplicants.has(
            idOf(
              applicant._id
            )
          )
      ).length,
  };
}


function buildApplicantManagementAnalytics({
  applicants = [],
  evaluations = [],
  interviews = [],
  activities = [],
  duplicateCases = [],
  submissions = [],
  documents = [],
  now = new Date(),
} = {}) {
  return {
    actionCenter:
      buildActionCenter({
        applicants,
        evaluations,
        interviews,
        duplicateCases,
        documents,
        submissions,
        now,
      }),

    upcomingInterviews:
      buildUpcomingInterviews({
        applicants,
        interviews,
        now,
        days: 7,
      }),

    dataQuality:
      buildDataQuality({
        applicants,
        documents,
        submissions,
      }),

    duplicates:
      buildDuplicateAnalytics(
        duplicateCases
      ),

    submissions:
      buildSubmissionAnalytics(
        submissions
      ),

    documents:
      buildDocumentAnalytics({
        applicants,
        documents,
        submissions,
      }),

    feedback: {
      recent:
        buildRecentFeedback({
          applicants,
          evaluations,
        }),
    },

    communications:
      buildCommunicationAnalytics(
        activities
      ),

    recentActivity:
      buildRecentActivity(
        activities
      ),
  };
}


module.exports = {
  SUBMISSION_STATUSES,
  SUBMISSION_SOURCES,
  PROFILE_QUALITY_FIELDS,

  buildCvApplicantIds,
  buildDataQuality,
  buildDuplicateAnalytics,
  buildSubmissionAnalytics,
  buildDocumentAnalytics,
  buildRecentFeedback,
  buildCommunicationAnalytics,
  buildRecentActivity,
  buildUpcomingInterviews,
  buildActionCenter,
  buildApplicantManagementAnalytics,
};
