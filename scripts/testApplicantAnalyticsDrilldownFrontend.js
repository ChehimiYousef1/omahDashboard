'use strict';

const fs =
  require('fs');

function read(path) {
  return fs.readFileSync(
    path,
    'utf8'
  );
}

function check(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      message
    );
  }

  console.log(
    `✅ ${message}`
  );
}


const dashboard =
  read(
    'omahconnect-admin/src/components/applicants/ApplicantAnalyticsDashboard.tsx'
  );

const overview =
  read(
    'omahconnect-admin/src/components/applicants/analytics/AnalyticsOverview.tsx'
  );

const management =
  read(
    'omahconnect-admin/src/components/applicants/analytics/ManagementAnalytics.tsx'
  );

const panel =
  read(
    'omahconnect-admin/src/components/applicants/analytics/ApplicantAnalyticsDrilldownPanel.tsx'
  );

const applications =
  read(
    'omahconnect-admin/src/pages/ApplicationsPage.tsx'
  );


check(
  dashboard.includes(
    'ApplicantAnalyticsDrilldownPanel'
  ) &&
  dashboard.includes(
    'drilldownType'
  ),
  'dashboard owns exact drill-down panel'
);


check(
  overview.includes(
    '"draft_evaluation"'
  ) &&
  overview.includes(
    '"incomplete_profile"'
  ),
  'Overview exact drill-down actions'
);


for (
  const type of [
    'missing_cv',
    'no_show',
    'overdue_interview',
    'no_submitted_evaluation',
    'no_interview',
    'high_confidence_duplicate',
  ]
) {
  check(
    management.includes(
      `"${type}"`
    ),
    `Management exact drill-down ${type}`
  );
}


check(
  panel.includes(
    'Open Applicant'
  ) &&
  panel.includes(
    'recordCount'
  ) &&
  panel.includes(
    'applicantCount'
  ),
  'drill-down panel shows exact operational records'
);


const dashboardStart =
  applications.indexOf(
    '<ApplicantAnalyticsDashboard'
  );

const dashboardEnd =
  applications.indexOf(
    '/>',
    dashboardStart
  );

const dashboardBlock =
  applications.slice(
    dashboardStart,
    dashboardEnd
  );

check(
  dashboardBlock.includes(
    'onOpenApplicant'
  ) &&
  applications.includes(
    'openApplicantFromAnalytics'
  ),
  'drill-down opens existing Applicant Profile Panel'
);


console.log(
  '\nAPPLICANT ANALYTICS DRILL-DOWN FRONTEND TEST PASSED'
);
