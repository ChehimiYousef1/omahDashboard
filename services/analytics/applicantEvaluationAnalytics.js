'use strict';

const {
  EVALUATION_CRITERIA,
  EVALUATION_RECOMMENDATIONS,
  EVALUATION_STATUSES,
} = require(
  '../../utils/applicantEvaluation'
);

const {
  average,
  minimum,
  maximum,
  percentage,
  fixedBreakdown,
  histogram,
  monthlySeries,
} = require(
  './applicantAnalyticsHelpers'
);


const RATING_BINS = [
  {
    key: '1.0-1.9',
    label: '1.0–1.9',
    min: 1,
    max: 2,
  },

  {
    key: '2.0-2.9',
    label: '2.0–2.9',
    min: 2,
    max: 3,
  },

  {
    key: '3.0-3.9',
    label: '3.0–3.9',
    min: 3,
    max: 4,
  },

  {
    key: '4.0-4.4',
    label: '4.0–4.4',
    min: 4,
    max: 4.5,
  },

  {
    key: '4.5-5.0',
    label: '4.5–5.0',
    min: 4.5,
    max: 5,
  },
];


const SCORE_BINS = [
  {
    key: '0-19',
    label: '0–19',
    min: 0,
    max: 20,
  },

  {
    key: '20-39',
    label: '20–39',
    min: 20,
    max: 40,
  },

  {
    key: '40-59',
    label: '40–59',
    min: 40,
    max: 60,
  },

  {
    key: '60-79',
    label: '60–79',
    min: 60,
    max: 80,
  },

  {
    key: '80-100',
    label: '80–100',
    min: 80,
    max: 100,
  },
];


function buildCriteriaAverages(
  evaluations
) {
  return Object.entries(
    EVALUATION_CRITERIA
  ).map(
    ([
      key,
      definition,
    ]) => ({
      key,

      label:
        definition.label,

      weight:
        definition.weight,

      average:
        average(
          evaluations.map(
            evaluation =>
              evaluation
                ?.criteria
                ?.[key]
          )
        ),
    })
  );
}


function buildEvaluationAnalytics(
  evaluations = []
) {
  const submitted =
    evaluations.filter(
      evaluation =>
        evaluation.status ===
        'submitted'
    );

  const ratings =
    submitted.map(
      evaluation =>
        evaluation
          .averageRating
    );

  const scores =
    submitted.map(
      evaluation =>
        evaluation
          .weightedScore
    );

  const positive =
    submitted.filter(
      evaluation =>
        [
          'strong_yes',
          'yes',
        ].includes(
          evaluation
            .recommendation
        )
    ).length;

  return {
    total:
      evaluations.length,

    submitted:
      submitted.length,

    draft:
      evaluations.filter(
        evaluation =>
          evaluation.status ===
          'draft'
      ).length,

    averageRating:
      average(
        ratings
      ),

    averageWeightedScore:
      average(
        scores
      ),

    minimumRating:
      minimum(
        ratings
      ),

    maximumRating:
      maximum(
        ratings
      ),

    minimumWeightedScore:
      minimum(
        scores
      ),

    maximumWeightedScore:
      maximum(
        scores
      ),

    positiveRecommendationRate:
      percentage(
        positive,
        submitted.length
      ),

    criteriaAverages:
      buildCriteriaAverages(
        submitted
      ),

    statuses:
      fixedBreakdown({
        records:
          evaluations,

        keys:
          EVALUATION_STATUSES,

        getKey:
          evaluation =>
            evaluation.status,
      }),

    recommendations:
      fixedBreakdown({
        records:
          submitted,

        keys:
          EVALUATION_RECOMMENDATIONS,

        getKey:
          evaluation =>
            evaluation
              .recommendation,
      }),

    ratingHistogram:
      histogram({
        values:
          ratings,

        bins:
          RATING_BINS,
      }),

    scoreHistogram:
      histogram({
        values:
          scores,

        bins:
          SCORE_BINS,
      }),

    trend:
      monthlySeries({
        records:
          submitted,

        getDate:
          evaluation =>
            evaluation
              .submittedAt ||
            evaluation
              .createdAt,
      }),
  };
}


module.exports = {
  RATING_BINS,
  SCORE_BINS,
  buildCriteriaAverages,
  buildEvaluationAnalytics,
};
