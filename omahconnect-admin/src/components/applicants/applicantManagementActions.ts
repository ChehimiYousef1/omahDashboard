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
  id: ApplicantManagementActionId;
  label: string;
  description: string;
  availability: ApplicantActionAvailability;
  plannedTask?: number;
  destructive?: boolean;
}

/*
|--------------------------------------------------------------------------
| Applicant Management Action Registry
|--------------------------------------------------------------------------
|
| This registry defines WHAT administrators may do from the Applicant
| workspace.
|
| It deliberately does not implement edit/archive/status permissions here.
| Those behaviors belong to Tasks 8, 9, 10 and 11.
|
*/

export const applicantManagementActions:
  ApplicantManagementAction[] = [
    {
      id: "send-email",
      label: "Send Email",
      description:
        "Open the existing applicant email workflow.",
      availability: "available",
    },

    {
      id: "view-submissions",
      label: "View Submissions",
      description:
        "Open the immutable Applicant submission history workspace.",
      availability: "available",
    },

    {
      id: "view-documents",
      label: "View Documents",
      description:
        "Open the Applicant documents workspace.",
      availability: "available",
    },

    {
      id: "edit-profile",
      label: "Edit Profile",
      description:
        "Edit administrator-controlled current Applicant profile fields.",
      availability: "planned",
      plannedTask: 8,
    },

    {
      id: "archive-applicant",
      label: "Archive Applicant",
      description:
        "Archive the Applicant without destroying historical records.",
      availability: "planned",
      plannedTask: 9,
      destructive: true,
    },

    {
      id: "change-status",
      label: "Change Status",
      description:
        "Move the Applicant through the controlled recruitment pipeline.",
      availability: "planned",
      plannedTask: 10,
    },
  ];

export function getApplicantManagementAction(
  id: ApplicantManagementActionId
) {
  return applicantManagementActions.find(
    (action) => action.id === id
  );
}

export function isApplicantActionAvailable(
  id: ApplicantManagementActionId
) {
  return (
    getApplicantManagementAction(id)
      ?.availability === "available"
  );
}
