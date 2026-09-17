'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const api =
  fs.readFileSync(
    'omahconnect-admin/src/services/api.ts',
    'utf8'
  );

const page =
  fs.readFileSync(
    'omahconnect-admin/src/pages/ApplicationsPage.tsx',
    'utf8'
  );

const dashboard =
  fs.readFileSync(
    'omahconnect-admin/src/components/applicants/ApplicantAnalyticsDashboard.tsx',
    'utf8'
  );

const files = {
  overview:
    fs.readFileSync(
      'omahconnect-admin/src/components/applicants/analytics/AnalyticsOverview.tsx',
      'utf8'
    ),

  pipeline:
    fs.readFileSync(
      'omahconnect-admin/src/components/applicants/analytics/PipelineAnalytics.tsx',
      'utf8'
    ),

  evaluations:
    fs.readFileSync(
      'omahconnect-admin/src/components/applicants/analytics/EvaluationAnalytics.tsx',
      'utf8'
    ),

  interviews:
    fs.readFileSync(
      'omahconnect-admin/src/components/applicants/analytics/InterviewAnalytics.tsx',
      'utf8'
    ),

  management:
    fs.readFileSync(
      'omahconnect-admin/src/components/applicants/analytics/ManagementAnalytics.tsx',
      'utf8'
    ),

  segmentation:
    fs.readFileSync(
      'omahconnect-admin/src/components/applicants/analytics/SegmentationAnalytics.tsx',
      'utf8'
    ),
};


assert.match(
  api,
  /analyticsVersion:\s*number/
);

assert.match(
  api,
  /pipelineAnalytics:/
);

assert.match(
  api,
  /segmentation:/
);

assert.match(
  api,
  /management:/
);

console.log(
  '✅ professional analytics TypeScript contract'
);


for (
  const filter of [
    'query.q',
    'query.positionTrack',
    'query.positionType',
    'query.country',
    'query.city',
    'query.source',
    'query.skill',
    'query.tag',
    'query.appliedFrom',
    'query.appliedTo',
  ]
) {
  assert.ok(
    api.includes(
      filter
    )
  );
}

console.log(
  '✅ all supported Applicant cohort filters mapped'
);


for (
  const label of [
    'Overview',
    'Pipeline',
    'Evaluations',
    'Interviews',
    'Notes & Tasks',
    'Management',
    'Segmentation',
    'Activity',
    'Data Quality',
    'Documents',
    'Submissions',
    'Communications',
  ]
) {
  assert.ok(
    dashboard.includes(
      label
    ),
    `Missing dashboard tab: ${label}`
  );
}

console.log(
  '✅ twelve professional analytics tabs'
);


assert.match(
  files.overview,
  /Action Center/
);

assert.match(
  files.pipeline,
  /Current Pipeline Funnel/
);

assert.match(
  files.pipeline,
  /Sankey/
);

assert.match(
  files.evaluations,
  /RadarChart/
);

assert.match(
  files.evaluations,
  /Rating Histogram/
);

assert.match(
  files.interviews,
  /PieChart/
);

assert.match(
  files.interviews,
  /Interview Activity Over Time/
);

assert.match(
  files.management,
  /Recruitment Priority Center/
);

assert.match(
  files.management,
  /Profile Data Quality/
);

assert.match(
  files.management,
  /Communication Activity/
);

assert.match(
  files.segmentation,
  /Programming Languages/
);

assert.match(
  files.segmentation,
  /AI \/ ML Skills/
);

console.log(
  '✅ funnel, Sankey, radar, histograms, donut, management and segmentation views'
);


assert.match(
  page,
  /"table"\s*\|\s*"pipeline"\s*\|\s*"analytics"/
);

assert.match(
  page,
  /Analytics View/
);

assert.match(
  page,
  /ApplicantAnalyticsDashboard/
);

console.log(
  '✅ Applicant Analytics View remains connected'
);


assert.match(
  dashboard,
  /Historical time-in-stage/
);

assert.match(
  dashboard,
  /complete status-transition audit history/
);

console.log(
  '✅ unsupported historical metrics remain protected'
);


console.log(
  '\nPROFESSIONAL APPLICANT DASHBOARD FRONTEND TEST PASSED'
);
