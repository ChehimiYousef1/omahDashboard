import {
  applicantManagementActions,
  getApplicantManagementAction,
  isApplicantActionAvailable,
} from "./applicantManagementActions";

function assert(
  condition: boolean,
  message: string
) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  applicantManagementActions.length === 6,
  "Expected six Applicant management actions."
);

assert(
  isApplicantActionAvailable(
    "send-email"
  ),
  "Send Email must be available."
);

assert(
  isApplicantActionAvailable(
    "view-submissions"
  ),
  "View Submissions must be available."
);

assert(
  !isApplicantActionAvailable(
    "edit-profile"
  ),
  "Edit Profile must remain planned until Task 8."
);

assert(
  !isApplicantActionAvailable(
    "archive-applicant"
  ),
  "Archive must remain planned until Task 9."
);

assert(
  getApplicantManagementAction(
    "archive-applicant"
  )?.destructive === true,
  "Archive must be marked as a sensitive/destructive action."
);

assert(
  getApplicantManagementAction(
    "change-status"
  )?.plannedTask === 10,
  "Status Management must remain owned by Task 10."
);

console.log(
  "TASK 7 ACTION REGISTRY TEST PASSED"
);
