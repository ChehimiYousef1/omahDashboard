const fs = require("fs");

function read(path) {
  return fs.readFileSync(
    path,
    "utf8"
  );
}

function assert(
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


const applications = read(
  "omahconnect-admin/src/pages/ApplicationsPage.tsx"
);

const dashboard = read(
  "omahconnect-admin/src/components/applicants/ApplicantAnalyticsDashboard.tsx"
);

const overview = read(
  "omahconnect-admin/src/components/applicants/analytics/AnalyticsOverview.tsx"
);

const management = read(
  "omahconnect-admin/src/components/applicants/analytics/ManagementAnalytics.tsx"
);

const duplicates = read(
  "omahconnect-admin/src/components/applicants/DuplicateReviewPanel.tsx"
);


assert(
  applications.includes(
    "openApplicantsFromAnalytics"
  ) &&
  applications.includes(
    'setViewMode(\n      "table"'
  ),
  "analytics can navigate safely to Applicant Table View"
);


assert(
  applications.includes(
    "duplicateReviewRequestKey"
  ) &&
  applications.includes(
    "openDuplicateReviewFromAnalytics"
  ),
  "analytics can request the existing Duplicate Review panel"
);


assert(
  dashboard.includes(
    "onViewApplicants"
  ) &&
  dashboard.includes(
    "onOpenDuplicateReview"
  ),
  "analytics dashboard callback contract connected"
);


assert(
  overview.includes(
    '"Needs Review"'
  ) &&
  overview.includes(
    '"Draft Evaluations"'
  ) &&
  overview.includes(
    '"Upcoming Interviews"'
  ) &&
  overview.includes(
    '"Offer Decisions"'
  ) &&
  overview.includes(
    '"Incomplete Profiles"'
  ),
  "Overview Action Center navigation connected"
);


assert(
  management.includes(
    '"Overdue Interviews"'
  ) &&
  management.includes(
    '"No Shows"'
  ) &&
  management.includes(
    '"Missing CV"'
  ) &&
  management.includes(
    '"Duplicate Cases"'
  ),
  "Management Priority Center navigation connected"
);


assert(
  overview.includes(
    'status:\n              "applied"'
  ) &&
  overview.includes(
    'status:\n              "offered"'
  ),
  "only truthful status-based Table drill-downs added"
);


assert(
  duplicates.includes(
    "openRequestKey"
  ) &&
  duplicates.includes(
    "useEffect"
  ),
  "Duplicate Review external-open mechanism connected"
);


assert(
  !overview.includes(
    'status:\n              "missing_cv"'
  ) &&
  !management.includes(
    'status:\n              "no_show"'
  ),
  "unsupported fake Applicant statuses were not introduced"
);


console.log(
  "\nAPPLICANT ANALYTICS NAVIGATION TEST PASSED"
);
