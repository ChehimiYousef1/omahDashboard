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
  fetchApplicantSubmissions,
  restoreApplicant,
  updateApplicantProfile,
  updateApplicantStatus,
  type ApplicantFormSubmission,
  type ApplicantMaster,
  type ApplicantProfileChanges,
  type ApplicantStatus,
} from "../../services/api";

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
        await fetchApplicantSubmissions(
          applicant._id
        );

      setSubmissions(data);
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
      tab === "submissions" ||
      tab === "documents"
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
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ProfileField
                    label="Full Name"
                    value={
                      applicant
                        .identity
                        .fullName
                    }
                  />

                  <ProfileField
                    label="Email"
                    value={
                      applicant
                        .identity
                        .email
                    }
                  />

                  <ProfileField
                    label="Phone"
                    value={
                      applicant
                        .identity
                        .phoneNumber
                    }
                  />

                  <ProfileField
                    label="WhatsApp"
                    value={
                      applicant
                        .identity
                        .whatsappNumber
                    }
                  />

                  <ProfileField
                    label="LinkedIn"
                    value={
                      applicant
                        .profiles
                        .linkedin
                    }
                  />

                  <ProfileField
                    label="GitHub"
                    value={
                      applicant
                        .profiles
                        .github
                    }
                  />

                  <ProfileField
                    label="Portfolio"
                    value={
                      applicant
                        .profiles
                        .portfolio
                    }
                  />

                  <ProfileField
                    label="Primary Skills"
                    value={
                      applicant
                        .skills
                        .primaryTechnical
                        .join(", ")
                    }
                  />
                </div>
              )}
            </section>
          )}

          {activeTab ===
            "submissions" && (
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Immutable Submission History
              </h3>

              {submissionsLoading ? (
                <p className="mt-4 text-xs text-slate-400">
                  Loading submissions...
                </p>
              ) : submissions.length ===
                0 ? (
                <p className="mt-4 text-xs text-slate-400">
                  No linked submissions.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {submissions.map(
                    (submission) => (
                      <div
                        key={
                          submission._id
                        }
                        className="rounded-lg border border-slate-100 p-4"
                      >
                        <p className="text-xs font-bold text-slate-800">
                          {submission
                            .personal
                            ?.fullName ||
                            "Submission"}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {submission
                            .personal
                            ?.email ||
                            "No email"}
                          {" · "}
                          {submission
                            .submittedAt
                            ? new Date(
                                submission.submittedAt
                              ).toLocaleString()
                            : "No submitted date"}
                        </p>

                        {submission
                          .submissionKey && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            Key:{" "}
                            {
                              submission
                                .submissionKey
                            }
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab ===
            "documents" && (
            <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Documents
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Documents remain attached to their immutable submissions.
              </p>

              {submissionsLoading ? (
                <p className="mt-4 text-xs text-slate-400">
                  Loading documents...
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {submissions
                    .filter(
                      (
                        submission
                      ) =>
                        submission.documents &&
                        Object.keys(
                          submission.documents
                        ).length >
                          0
                    )
                    .map(
                      (
                        submission
                      ) => (
                        <pre
                          key={
                            submission._id
                          }
                          className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-[10px] text-slate-600"
                        >
                          {JSON.stringify(
                            submission.documents,
                            null,
                            2
                          )}
                        </pre>
                      )
                    )}

                  {!submissions.some(
                    (
                      submission
                    ) =>
                      submission.documents &&
                      Object.keys(
                        submission.documents
                      ).length >
                        0
                  ) && (
                    <p className="text-xs text-slate-400">
                      No linked documents found.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {![
            "overview",
            "current-profile",
            "submissions",
            "documents",
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

