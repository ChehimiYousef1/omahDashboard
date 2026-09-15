'use strict';

const {
  INTERVIEW_TYPES,
  INTERVIEW_STATUSES,
  INTERVIEW_FORMATS,
  INTERVIEW_OUTCOMES,
} = require(
  '../../utils/applicantInterview'
);

const {
  percentage,
  fixedBreakdown,
  monthKey,
} = require(
  './applicantAnalyticsHelpers'
);


function interviewStatusTrend(
  interviews = []
) {
  const periods =
    new Map();

  for (
    const interview of interviews
  ) {
    const period =
      monthKey(
        interview
          .scheduledStart
      );

    if (!period) {
      continue;
    }

    if (
      !periods.has(
        period
      )
    ) {
      periods.set(
        period,
        {
          period,

          total: 0,

          scheduled: 0,
          completed: 0,
          cancelled: 0,
          no_show: 0,
        }
      );
    }

    const row =
      periods.get(
        period
      );

    row.total +=
      1;

    if (
      Object.prototype
        .hasOwnProperty.call(
          row,
          interview.status
        )
    ) {
      row[
        interview.status
      ] += 1;
    }
  }

  return [
    ...periods.values(),
  ].sort(
    (a, b) =>
      a.period.localeCompare(
        b.period
      )
  );
}


function buildInterviewAnalytics(
  interviews = []
) {
  const completed =
    interviews.filter(
      interview =>
        interview.status ===
        'completed'
    ).length;

  const noShow =
    interviews.filter(
      interview =>
        interview.status ===
        'no_show'
    ).length;

  const recommended =
    interviews.filter(
      interview =>
        interview.outcome ===
        'recommended'
    ).length;

  return {
    total:
      interviews.length,

    completed,

    noShow,

    completionRate:
      percentage(
        completed,
        interviews.length
      ),

    noShowRate:
      percentage(
        noShow,
        interviews.length
      ),

    recommendedOutcomeRate:
      percentage(
        recommended,
        interviews.length
      ),

    statuses:
      fixedBreakdown({
        records:
          interviews,

        keys:
          INTERVIEW_STATUSES,

        getKey:
          interview =>
            interview.status,
      }),

    outcomes:
      fixedBreakdown({
        records:
          interviews,

        keys:
          INTERVIEW_OUTCOMES,

        getKey:
          interview =>
            interview.outcome,
      }),

    types:
      fixedBreakdown({
        records:
          interviews,

        keys:
          INTERVIEW_TYPES,

        getKey:
          interview =>
            interview.type,
      }),

    formats:
      fixedBreakdown({
        records:
          interviews,

        keys:
          INTERVIEW_FORMATS,

        getKey:
          interview =>
            interview.format,
      }),

    trend:
      interviewStatusTrend(
        interviews
      ),
  };
}


module.exports = {
  interviewStatusTrend,
  buildInterviewAnalytics,
};
