'use strict';

const {
  APPLICANT_PIPELINE_STAGES,
} = require(
  '../../utils/applicantStatus'
);

const {
  percentage,
  rankedBreakdown,
  buildMatrix,
} = require(
  './applicantAnalyticsHelpers'
);

const {
  buildStatusTransitionFlow,
} = require(
  './applicantActivityFlowAnalytics'
);


function buildCurrentPipeline(
  applicants = []
) {
  return APPLICANT_PIPELINE_STAGES
    .map(
      stage => {
        const count =
          applicants.filter(
            applicant =>
              applicant
                ?.recruitment
                ?.status ===
              stage.value
          ).length;

        return {
          status:
            stage.value,

          label:
            stage.label,

          order:
            stage.order,

          terminal:
            stage.terminal,

          count,

          percent:
            percentage(
              count,
              applicants.length
            ),
        };
      }
    );
}


function buildPipelineFunnel(
  applicants = []
) {
  const distribution =
    buildCurrentPipeline(
      applicants
    );

  const maxCount =
    Math.max(
      1,
      ...distribution.map(
        stage =>
          stage.count
      )
    );

  return distribution
    .map(
      stage => ({
        ...stage,

        relativeWidth:
          percentage(
            stage.count,
            maxCount
          ),
      })
    );
}


function buildStageMatrix({
  applicants = [],
  dimension,
  top = 10,
}) {
  const getter =
    dimension ===
      'source'
      ? applicant =>
          applicant
            ?.recruitment
            ?.source
      : applicant =>
          applicant
            ?.preferences
            ?.positionTrack;

  const ranked =
    rankedBreakdown({
      records:
        applicants,

      getValues:
        getter,

      limit:
        top,
    });

  return buildMatrix({
    records:
      applicants,

    rowValues:
      ranked.map(
        item => ({
          key:
            item.label,

          label:
            item.label,
        })
      ),

    columnKeys:
      APPLICANT_PIPELINE_STAGES
        .map(
          stage =>
            stage.value
        ),

    getRow:
      getter,

    getColumn:
      applicant =>
        applicant
          ?.recruitment
          ?.status,
  });
}


function buildPipelineAnalytics({
  applicants = [],
  activities = [],
} = {}) {
  return {
    stages:
      buildCurrentPipeline(
        applicants
      ),

    funnel:
      buildPipelineFunnel(
        applicants
      ),

    positionByStage:
      buildStageMatrix({
        applicants,
        dimension:
          'position',
      }),

    sourceByStage:
      buildStageMatrix({
        applicants,
        dimension:
          'source',
      }),

    recordedFlow:
      buildStatusTransitionFlow(
        activities
      ),
  };
}


module.exports = {
  buildCurrentPipeline,
  buildPipelineFunnel,
  buildStageMatrix,
  buildPipelineAnalytics,
};
