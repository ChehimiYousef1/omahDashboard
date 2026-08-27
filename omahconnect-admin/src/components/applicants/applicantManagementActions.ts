export type ApplicantManagementActionId =
  | "send-email"
  | "view-submissions"
  | "view-documents"
  | "edit-profile"
  | "archive-applicant"
  | "change-status";

export type ApplicantActionAvailability =
  | "available"
  | "planned";

export interface ApplicantManagementAction {
  id:
    ApplicantManagementActionId;

  label: string;
  description: string;

  availability:
    ApplicantActionAvailability;

  plannedTask?: number;
  destructive?: boolean;
}

export const applicantManagementActions:
  ApplicantManagementAction[] = [
    {
      id: "send-email",
      label: "Send Email",
      description:
        "Communication will be connected in the dedicated Email & WhatsApp enhancement.",
      availability:
        "available",
    },

    {
      id: "view-submissions",
      label:
        "View Submissions",
      description:
        "Open immutable Applicant submission history.",
      availability:
        "available",
    },

    {
      id: "view-documents",
      label:
        "View Documents",
      description:
        "View documents preserved with Applicant submissions.",
      availability:
        "available",
    },

    {
      id: "edit-profile",
      label: "Edit Profile",
      description:
        "Edit administrator-controlled current Applicant profile fields.",
      availability:
        "available",
    },

    {
      id:
        "archive-applicant",
      label:
        "Archive Applicant",
      description:
        "Archive or restore the Applicant without destroying historical records.",
      availability:
        "available",
      destructive: true,
    },

    {
      id: "change-status",
      label: "Change Status",
      description:
        "Move the Applicant through the controlled recruitment pipeline.",
      availability:
        "available",
    },
  ];

export function getApplicantManagementAction(
  id: ApplicantManagementActionId
) {
  return applicantManagementActions.find(
    (action) =>
      action.id === id
  );
}

export function isApplicantActionAvailable(
  id: ApplicantManagementActionId
) {
  return (
    getApplicantManagementAction(
      id
    )?.availability ===
    "available"
  );
}

