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
    throw new Error(
      message
    );
  }
}

assert(
  applicantManagementActions.length ===
    6,
  "Expected six Applicant management actions."
);

for (
  const id of [
    "view-submissions",
    "view-documents",
    "edit-profile",
    "archive-applicant",
    "change-status",
  ] as const
) {
  assert(
    isApplicantActionAvailable(
      id
    ),
    `${id} must be available after Task 14.`
  );
}

assert(
  getApplicantManagementAction(
    "archive-applicant"
  )?.destructive === true,
  "Archive must remain marked as a sensitive action."
);

