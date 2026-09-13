import {
  useState,
} from "react";

import {
  Archive,
  FileText,
  Mail,
  Phone,
  RotateCcw,
  X,
} from "lucide-react";

import {
  archiveApplicant,
  fetchApplicantSubmissionHistory,
  restoreApplicant,
  updateApplicantProfile,
  updateApplicantStatus,
  type ApplicantFormSubmission,
  type ApplicantSubmissionHistoryItem,
  type ApplicantSubmissionHistorySummary,
  type ApplicantMaster,
  type ApplicantProfileChanges,
  type ApplicantStatus,
} from "../../services/api";

import {
  ApplicantSubmissionHistoryPanel,
} from "./ApplicantSubmissionHistoryPanel";

import {
  ApplicantCurrentProfileView,
} from "./ApplicantCurrentProfileView";

import {
  ApplicantEvaluationPanel,
} from "./ApplicantEvaluationPanel";

import {
  ApplicantInterviewPanel,
} from "./ApplicantInterviewPanel";

import {
  ApplicantDocumentsPanel,
} from "./ApplicantDocumentsPanel";

import {
  applicantManagementActions,
  type ApplicantManagementActionId,
} from "./applicantManagementActions";

type ProfileTab =
  | "overview"
  | "current-profile"
  | "submissions"
  | "documents"
  | "evaluations"
  | "interviews"
  | "communications"
  | "notes"
  | "activity";

interface ApplicantProfilePanelProps {
  applicant:
    ApplicantMaster;

  onClose: () => void;

  onChanged:
    () => Promise<void>;
}

const tabs: Array<{
  id: ProfileTab;
  label: string;
}> = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "current-profile",
    label: "Current Profile",
  },
  {
    id: "submissions",
    label: "Submissions",
  },
  {
    id: "documents",
    label: "Documents",
  },
  {
    id: "evaluations",
    label: "Evaluations",
  },
  {
    id: "interviews",
    label: "Interviews",
  },
  {
    id: "communications",
    label: "Communications",
  },
  {
    id: "notes",
    label: "Notes / Tasks",
  },
  {
    id: "activity",
    label: "Activity",
  },
];

function initials(
  name: string
) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
    )
    .join("")
    .toUpperCase();
}

function isSafeDocumentUrl(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol === "https:" ||
      (
        url.protocol === "http:" &&
        (
          url.hostname ===
            "localhost" ||
          url.hostname ===
            "127.0.0.1"
        )
      )
    );
  } catch {
    return false;
  }
}


function documentValues(
  value:
    | string
    | string[]
    | undefined
): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item) =>
        isSafeDocumentUrl(item)
    );
  }

  return isSafeDocumentUrl(value)
    ? [value]
    : [];
}


function errorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              error?: string;
            };
          };
        }
      ).response;

    if (
      response?.data?.error
    ) {
      return response.data.error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Unexpected error";
}

export function ApplicantProfilePanel({
  applicant,
  onClose,
  onChanged,
}: ApplicantProfilePanelProps) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ProfileTab>(
      "overview"
    );

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    submissions,
    setSubmissions,
  ] =
    useState<
      ApplicantFormSubmission[]
    >([]);

  const [
    submissionHistory,
    setSubmissionHistory,
  ] =
    useState<
      ApplicantSubmissionHistoryItem[]
    >([]);

  const [
    submissionSummary,
    setSubmissionSummary,
  ] =
    useState<
      ApplicantSubmissionHistorySummary
    >({
      total: 0,
      changed: 0,
      matchesCurrent: 0,
      initial: 0,
    });

  const [
    submissionsLoaded,
    setSubmissionsLoaded,
  ] =
    useState(false);

  const [
    submissionsLoading,
    setSubmissionsLoading,
  ] =
    useState(false);

  const [
    form,
    setForm,
  ] = useState({
    fullName:
      applicant.identity
        .fullName,

    email:
      applicant.identity
        .email,

    phoneNumber:
      applicant.identity
        .phoneNumber,

    whatsappNumber:
      applicant.identity
        .whatsappNumber,

    country:
      applicant.identity
        .country,

    city:
      applicant.identity
        .city,

    positionTrack:
      applicant.preferences
        .positionTrack,

    linkedin:
      applicant.profiles
        .linkedin,

    github:
      applicant.profiles
        .github,

    portfolio:
      applicant.profiles
        .portfolio,
  });

  async function loadSubmissions() {
    if (
      submissionsLoaded ||
      submissionsLoading
    ) {
      return;
    }

    try {
      setSubmissionsLoading(
        true
      );

      const data =
        await fetchApplicantSubmissionHistory(
          applicant._id
        );

      setSubmissions(
        data.submissions
      );

      setSubmissionHistory(
        data.history
      );

      setSubmissionSummary(
        data.summary
      );
      setSubmissionsLoaded(
        true
      );
    } catch (error) {
      window.alert(
        errorMessage(error)
      );
    } finally {
      setSubmissionsLoading(
        false
      );
    }
  }

  function openTab(
    tab: ProfileTab
  ) {
    setActiveTab(tab);

    if (
      tab === "current-profile" ||
      tab === "submissions" ||
      tab === "documents" ||
      tab === "evaluations"
    ) {
      void loadSubmissions();
    }
  }

  async function saveProfile() {
    const changes:
      ApplicantProfileChanges =
      {
        "identity.fullName":
          form.fullName,

        "identity.email":
          form.email,

        "identity.phoneNumber":
          form.phoneNumber,

        "identity.whatsappNumber":
          form.whatsappNumber,

        "identity.country":
          form.country,

        "identity.city":
          form.city,

        "preferences.positionTrack":
          form.positionTrack,

        "profiles.linkedin":
          form.linkedin,

        "profiles.github":
          form.github,

        "profiles.portfolio":
          form.portfolio,
      };

    try {
      setSaving(true);

      await updateApplicantProfile(
        applicant._id,
        changes
      );

      await onChanged();

      window.alert(
        "Applicant profile updated."
      );

      onClose();
    } catch (error) {
      window.alert(
        errorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus() {
    const value =
      window.prompt(
        "New status: applied, reviewed, interview, hired, rejected",
        applicant.recruitment
          .status
      );

    if (!value) {
      return;
    }

    const allowed:
      ApplicantStatus[] = [
        "applied",
        "reviewed",
        "interview",
        "hired",
        "rejected",
      ];

    const normalized =
      value
        .trim()
        .toLowerCase() as
        ApplicantStatus;

    if (
      !allowed.includes(
        normalized
      )
    ) {
      window.alert(
        "Invalid Applicant status."
      );

      return;
    }

    try {
      await updateApplicantStatus(
        applicant._id,
        normalized
      );

      await onChanged();
      onClose();
    } catch (error) {
      window.alert(
        errorMessage(error)
      );
    }
  }

  async function toggleArchive() {
    if (
      applicant.lifecycle
        .archived
    ) {
      if (
        !window.confirm(
          "Restore this Applicant?"
        )
      ) {
        return;
      }

      try {
        await restoreApplicant(
          applicant._id
        );

        await onChanged();
        onClose();
      } catch (error) {
        window.alert(
          errorMessage(error)
        );
      }

      return;
    }

    if (
      !window.confirm(
        "Archive this Applicant? Historical submissions will remain preserved."
      )
    ) {
      return;
    }

    const reason =
      window.prompt(
        "Optional archive reason:",
        ""
      ) ?? "";

    try {
      await archiveApplicant(
        applicant._id,
        reason
      );

      await onChanged();
      onClose();
    } catch (error) {
      window.alert(
        errorMessage(error)
      );
    }
  }

  function handleManagementAction(
    actionId:
      ApplicantManagementActionId
  ) {
    switch (actionId) {
      case "view-submissions":
        openTab(
          "submissions"
        );
        break;

      case "view-documents":
        openTab(
          "documents"
        );
        break;

      case "edit-profile":
        setEditing(true);
        setActiveTab(
          "current-profile"
        );
        break;

      case "change-status":
        void changeStatus();
        break;

      case "archive-applicant":
        void toggleArchive();
        break;

      case "send-email":
        window.alert(
          "Applicant communication will be connected in the dedicated Email & WhatsApp enhancement."
        );
        break;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs">
      <div className="ml-auto flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                {initials(
                  applicant
                    .identity
                    .fullName
                ) || "AP"}
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {
                    applicant
                      .identity
                      .fullName
                  }
                </h2>

                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {
                      applicant
                        .identity
                        .email
                    }
                  </span>

                  {applicant.identity
                    .phoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />

                      {
                        applicant
                          .identity
                          .phoneNumber
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              aria-label="Close Applicant profile"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <nav className="overflow-x-auto border-b border-slate-200 bg-white px-6">
          <div className="flex min-w-max gap-1">
            {tabs.map(
              (tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    openTab(
                      tab.id
                    )
                  }
                  className={
                    `border-b-2 px-3 py-3 text-[11px] font-bold ${
                      activeTab ===
                      tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`
                  }
                >
                  {tab.label}
                </button>
              )
            )}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab ===
            "overview" && (
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  Applicant Overview
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <ProfileField
                    label="Position"
                    value={
                      applicant
                        .preferences
                        .positionTrack
                    }
                  />

                  <ProfileField
                    label="Status"
                    value={
                      applicant
                        .recruitment
                        .status
                    }
                  />

                  <ProfileField
                    label="Source"
                    value={
                      applicant
                        .recruitment
                        .source
                    }
                  />

                  <ProfileField
                    label="Profile Version"
                    value={
                      applicant
                        .profileVersion
                    }
                  />

                  <ProfileField
                    label="University"
                    value={
                      applicant
                        .education
                        .universityName
                    }
                  />

                  <ProfileField
                    label="Major"
                    value={
                      applicant
                        .education
                        .major
                    }
                  />

                  <ProfileField
                    label="Country"
                    value={
                      applicant
                        .identity
                        .country
                    }
                  />

                  <ProfileField
                    label="City"
                    value={
                      applicant
                        .identity
                        .city
                    }
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  Management Actions
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {applicantManagementActions.map(
                    (action) => {
                      const archiveAction =
                        action.id ===
                        "archive-applicant";

                      const label =
                        archiveAction &&
                        applicant
                          .lifecycle
                          .archived
                          ? "Restore Applicant"
                          : action.label;

                      return (
                        <button
                          key={
                            action.id
                          }
                          type="button"
                          onClick={() =>
                            handleManagementAction(
                              action.id
                            )
                          }
                          className={
                            `rounded-lg border p-3 text-left transition ${
                              archiveAction
                                ? "border-amber-200 hover:bg-amber-50"
                                : "border-slate-200 hover:border-blue-200 hover:bg-blue-50/30"
                            }`
                          }
                        >
                          <div className="flex items-center gap-2">
                            {archiveAction &&
                              (applicant
                                .lifecycle
                                .archived ? (
                                <RotateCcw className="h-4 w-4" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              ))}

                            <span className="text-xs font-bold text-slate-800">
                              {label}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                            {
                              action.description
                            }
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab ===
            "current-profile" && (
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Current Approved Profile
                </h3>

                {!editing && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditing(
                        true
                      )
                    }
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {editing ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <EditField
                    label="Full Name"
                    value={
                      form.fullName
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          fullName:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="Email"
                    value={
                      form.email
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          email:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="Phone"
                    value={
                      form.phoneNumber
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          phoneNumber:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="WhatsApp"
                    value={
                      form.whatsappNumber
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          whatsappNumber:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="Country"
                    value={
                      form.country
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          country:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="City"
                    value={
                      form.city
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          city:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="Position"
                    value={
                      form.positionTrack
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          positionTrack:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="LinkedIn"
                    value={
                      form.linkedin
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          linkedin:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="GitHub"
                    value={
                      form.github
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          github:
                            value,
                        })
                      )
                    }
                  />

                  <EditField
                    label="Portfolio"
                    value={
                      form.portfolio
                    }
                    onChange={(
                      value
                    ) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          portfolio:
                            value,
                        })
                      )
                    }
                  />

                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void saveProfile()
                      }
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {saving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setEditing(
                          false
                        )
                      }
                      className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <ApplicantCurrentProfileView
                  applicant={applicant}
                  submissions={submissions}
                  loadingSubmissions={
                    submissionsLoading
                  }
                  onViewAllDocuments={() =>
                    openTab(
                      "documents"
                    )
                  }
                />
              )}
            </section>
          )}

          {activeTab ===
            "submissions" && (
            <ApplicantSubmissionHistoryPanel
              submissions={
                submissions
              }
              history={
                submissionHistory
              }
              summary={
                submissionSummary
              }
              loading={
                submissionsLoading
              }
            />
          )}

          {activeTab ===
            "documents" && (
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <ApplicantDocumentsPanel
                applicantId={applicant._id}
              />

              <h3 className="text-sm font-bold text-slate-900">
                Submission Documents & Supporting Files
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Historical documents remain attached to their immutable Form submissions and are preserved separately from managed documents.
              </p>

              {submissionsLoading ? (
                <p className="mt-4 text-xs text-slate-400">
                  Loading documents...
                </p>
              ) : submissions.length ===
                0 ? (
                <p className="mt-4 text-xs text-slate-400">
                  No linked submissions.
                </p>
              ) : (
                <div className="mt-5 space-y-5">
                  {submissions.map(
                    (
                      submission,
                      submissionIndex
                    ) => {
                      const documents =
                        submission.documents;

                      if (!documents) {
                        return null;
                      }

                      const groups = [
                        {
                          label:
                            "CV / Resume",
                          values:
                            documentValues(
                              documents.cvResume
                            ),
                        },
                        {
                          label:
                            "Identity Document",
                          values:
                            documentValues(
                              documents.identityDocument
                            ),
                        },
                        {
                          label:
                            "University / Enrollment Document",
                          values:
                            documentValues(
                              documents.enrollmentDocument
                            ),
                        },
                        {
                          label:
                            "Degree / Graduation Certificate",
                          values:
                            documentValues(
                              documents.degreeCertificate
                            ),
                        },
                        {
                          label:
                            "Training Certificates",
                          values:
                            documentValues(
                              documents.trainingCertificates
                            ),
                        },
                        {
                          label:
                            "Recommendation Letters",
                          values:
                            documentValues(
                              documents.recommendationLetters
                            ),
                        },
                        {
                          label:
                            "Portfolio / Work Samples",
                          values:
                            documentValues(
                              documents.portfolioWorkSamples
                            ),
                        },
                        {
                          label:
                            "Additional Supporting Documents",
                          values:
                            documentValues(
                              documents.additionalSupportingDocuments
                            ),
                        },
                      ].filter(
                        (group) =>
                          group.values
                            .length > 0
                      );

                      if (
                        groups.length === 0
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={
                            submission._id
                          }
                          className="rounded-xl border border-slate-100 p-4"
                        >
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Submission{" "}
                                {
                                  submissionIndex +
                                  1
                                }
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">
                                {submission
                                  .submittedAt
                                  ? new Date(
                                      submission
                                        .submittedAt
                                    ).toLocaleString()
                                  : "Submission date unavailable"}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {groups.map(
                              (group) => (
                                <div
                                  key={
                                    group.label
                                  }
                                  className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                                >
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                    {
                                      group.label
                                    }
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {group.values.map(
                                      (
                                        url,
                                        index
                                      ) => (
                                        <a
                                          key={`${group.label}-${index}`}
                                          href={
                                            url
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700"
                                        >
                                          <FileText className="h-3.5 w-3.5" />

                                          {group.label ===
                                          "CV / Resume"
                                            ? group
                                                .values
                                                .length >
                                              1
                                              ? `View CV ${
                                                  index +
                                                  1
                                                }`
                                              : "View CV"
                                            : group
                                                  .values
                                                  .length >
                                                1
                                              ? `Open ${
                                                  index +
                                                  1
                                                }`
                                              : "Open"}
                                        </a>
                                      )
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}

                  {!submissions.some(
                    (submission) => {
                      const docs =
                        submission.documents;

                      return Boolean(
                        docs &&
                        [
                          docs.cvResume,
                          docs.identityDocument,
                          docs.enrollmentDocument,
                          docs.degreeCertificate,
                          ...(docs.trainingCertificates ||
                            []),
                          ...(docs.recommendationLetters ||
                            []),
                          ...(docs.portfolioWorkSamples ||
                            []),
                          ...(docs.additionalSupportingDocuments ||
                            []),
                        ].some(
                          (value) =>
                            typeof value ===
                              "string" &&
                            value.trim()
                        )
                      );
                    }
                  ) && (
                    <p className="text-xs text-slate-400">
                      No linked documents found.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab ===
            "evaluations" && (
            <ApplicantEvaluationPanel
              applicant={
                applicant
              }
              submissions={
                submissions
              }
              loadingSubmissions={
                submissionsLoading
              }
            />
          )}

          {activeTab ===
            "interviews" && (
            <ApplicantInterviewPanel
              applicant={applicant}
              submissions={submissions}
            />
          )}

          {![
            "overview",
            "current-profile",
            "submissions",
            "documents",
            "evaluations",
            "interviews",
          ].includes(
            activeTab
          ) && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />

              <h3 className="mt-3 text-sm font-bold text-slate-800">
                {
                  tabs.find(
                    (tab) =>
                      tab.id ===
                      activeTab
                  )?.label
                }
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                This area belongs to its dedicated enhancement module.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?:
    | string
    | number
    | null;
}) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="mt-1 block break-words text-xs font-semibold text-slate-800">
        {value || "—"}
      </span>
    </div>
  );
}


function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange:
    (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
      />
    </label>
  );
}

