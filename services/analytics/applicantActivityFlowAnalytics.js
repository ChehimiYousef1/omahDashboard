'use strict';

const {
  APPLICANT_PIPELINE_STAGES,
} = require(
  '../../utils/applicantStatus'
);

const {
  fixedBreakdown,
  monthlySeries,
} = require(
  './applicantAnalyticsHelpers'
);


const ACTIVITY_CATEGORIES = [
  'submission',
  'profile',
  'status',
  'evaluation',
  'interview',
  'communication',
  'lifecycle',
  'note',
  'task',
  'document',
];


function buildStatusTransitionFlow(
  activities = []
) {
  const stageIndex =
    new Map(
      APPLICANT_PIPELINE_STAGES.map(
        (
          stage,
          index
        ) => [
          stage.value,
          index,
        ]
      )
    );

  const nodes =
    APPLICANT_PIPELINE_STAGES
      .map(
        stage => ({
          name:
            stage.label,

          status:
            stage.value,
        })
      );

  const linkMap =
    new Map();

  const statusActivities =
    activities.filter(
      activity =>
        activity?.type ===
        'status.changed'
    );

  for (
    const activity of statusActivities
  ) {
    const previous =
      String(
        activity
          ?.metadata
          ?.previousStatus ||
        ''
      )
        .trim()
        .toLowerCase();

    const next =
      String(
        activity
          ?.metadata
          ?.nextStatus ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      !stageIndex.has(
        previous
      ) ||
      !stageIndex.has(
        next
      ) ||
      previous === next
    ) {
      continue;
    }

    const key =
      `${previous}->${next}`;

    const existing =
      linkMap.get(
        key
      );

    if (existing) {
      existing.value +=
        1;
    } else {
      linkMap.set(
        key,
        {
          source:
            stageIndex.get(
              previous
            ),

          target:
            stageIndex.get(
              next
            ),

          value: 1,

          previousStatus:
            previous,

          nextStatus:
            next,
        }
      );
    }
  }

  const links =
    [
      ...linkMap.values(),
    ].sort(
      (a, b) =>
        b.value -
        a.value
    );

  const occurredDates =
    statusActivities
      .map(
        activity =>
          new Date(
            activity
              .occurredAt
          )
      )
      .filter(
        date =>
          !Number.isNaN(
            date.getTime()
          )
      )
      .sort(
        (a, b) =>
          a - b
      );

  return {
    nodes,
    links,

    recordedTransitions:
      links.reduce(
        (
          sum,
          link
        ) =>
          sum +
          link.value,
        0
      ),

    firstRecordedAt:
      occurredDates[0]
        ?.toISOString() ||
      null,

    lastRecordedAt:
      occurredDates[
        occurredDates.length -
        1
      ]?.toISOString() ||
      null,

    historicalCoverage:
      'partial',
  };
}


function buildActivityAnalytics(
  activities = []
) {
  const categoryLabels = {
    submission:
      'Submissions',

    profile:
      'Profile',

    status:
      'Status Changes',

    evaluation:
      'Evaluations',

    interview:
      'Interviews',

    communication:
      'Communications',

    lifecycle:
      'Lifecycle',

    note:
      'Notes',

    task:
      'Tasks',

    document:
      'Documents',
  };

  return {
    total:
      activities.length,

    categories:
      fixedBreakdown({
        records:
          activities,

        keys:
          ACTIVITY_CATEGORIES,

        getKey:
          activity =>
            activity.category,

        labels:
          categoryLabels,
      }),

    trend:
      monthlySeries({
        records:
          activities,

        getDate:
          activity =>
            activity
              .occurredAt,
      }),

    statusFlow:
      buildStatusTransitionFlow(
        activities
      ),
  };
}


module.exports = {
  ACTIVITY_CATEGORIES,
  buildStatusTransitionFlow,
  buildActivityAnalytics,
};
