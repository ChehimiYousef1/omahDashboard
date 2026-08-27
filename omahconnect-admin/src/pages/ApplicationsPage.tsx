import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  archiveApplicant,
  fetchApplicantMasters,
  restoreApplicant,
  updateApplicantStatus,
  type ApplicantLifecycleFilter,
  type ApplicantMaster,
  type ApplicantStatus,
} from "../services/api";

import { Header } from "../components/layout/Header";

import { ApplicantProfilePanel } from "../components/applicants/ApplicantProfilePanel";

import {
  Archive,
  Calendar,
  Eye,
  FileText,
  Loader2,
  Phone,
  RotateCcw,
  Search,
} from "lucide-react";

interface ApplicationsPageProps {
  onTriggerEmail?: (
    recipientId: string,
    campaignType: string,
    recipientType:
      | "direct"
      | "applicant"
      | "bulk"
  ) => void;
}

/*
 * Communication remains owned by the
 * dedicated Communication enhancement.
 *
 * The prop stays here so App.tsx remains
 * backward compatible during migration.
 */

const ALL_STATUSES:
  ApplicantStatus[] = [
    "applied",
    "reviewed",
    "interview",
    "hired",
    "rejected",
  ];

const STATUS_TRANSITIONS:
  Record<
    ApplicantStatus,
    ApplicantStatus[]
  > = {
    applied: [
      "reviewed",
      "interview",
      "rejected",
    ],

    reviewed: [
      "applied",
      "interview",
      "rejected",
    ],

    interview: [
      "reviewed",
      "hired",
      "rejected",
    ],

    hired: [
      "interview",
    ],

    rejected: [
      "applied",
      "reviewed",
    ],
  };

function allowedStatuses(
  current: ApplicantStatus
) {
  return [
    current,
    ...STATUS_TRANSITIONS[current],
  ];
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString();
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

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unexpected error";
}

export function ApplicationsPage({
  onTriggerEmail,
}: ApplicationsPageProps) {
  /*
   * Intentionally not connected to the
   * legacy email-by-Application-ID flow.
   */
  void onTriggerEmail;

  const [
    applicants,
    setApplicants,
  ] = useState<
    ApplicantMaster[]
  >([]);

  const [
    selectedApplicant,
    setSelectedApplicant,
  ] = useState<
    ApplicantMaster | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "All" | ApplicantStatus
  >("All");

  const [
    lifecycleFilter,
    setLifecycleFilter,
  ] = useState<
    ApplicantLifecycleFilter
  >("false");

  const [
    dateFilter,
    setDateFilter,
  ] = useState("All");

  const [
    filterNow,
    setFilterNow,
  ] = useState(0);

  const loadApplicants =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const data =
            await fetchApplicantMasters(
              lifecycleFilter,
              200
            );

          setApplicants(data);
          setFilterNow(Date.now());
        } catch (err) {
          setError(
            errorMessage(err)
          );
        } finally {
          setLoading(false);
        }
      },
      [lifecycleFilter]
    );

  useEffect(() => {
    // Initial Applicant API load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadApplicants();
  }, [loadApplicants]);

  async function handleStatusChange(
    applicant:
      ApplicantMaster,
    nextStatus:
      ApplicantStatus
  ) {
    if (
      applicant.recruitment
        .status === nextStatus
    ) {
      return;
    }

    try {
      await updateApplicantStatus(
        applicant._id,
        nextStatus
      );

      await loadApplicants();
    } catch (err) {
      window.alert(
        errorMessage(err)
      );
    }
  }

  async function handleArchive(
    applicant:
      ApplicantMaster
  ) {
    const confirmed =
      window.confirm(
        "Archive this Applicant? Historical submissions will be preserved."
      );

    if (!confirmed) {
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

      setSelectedApplicant(
        null
      );

      await loadApplicants();
    } catch (err) {
      window.alert(
        errorMessage(err)
      );
    }
  }

  async function handleRestore(
    applicant:
      ApplicantMaster
  ) {
    const confirmed =
      window.confirm(
        "Restore this Applicant?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await restoreApplicant(
        applicant._id
      );

      setSelectedApplicant(
        null
      );

      await loadApplicants();
    } catch (err) {
      window.alert(
        errorMessage(err)
      );
    }
  }

  const filteredApplicants =
    useMemo(() => {
      return applicants.filter(
        (applicant) => {
          const query =
            searchQuery
              .trim()
              .toLowerCase();

          const searchable =
            [
              applicant.identity
                .fullName,

              applicant.identity
                .email,

              applicant.identity
                .phoneNumber,

              applicant.preferences
                .positionTrack,

              applicant.education
                .universityName,

              applicant.education
                .major,

              ...applicant.skills
                .primaryTechnical,
            ]
              .join(" ")
              .toLowerCase();

          const matchesQuery =
            !query ||
            searchable.includes(
              query
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            applicant.recruitment
              .status ===
              statusFilter;

          const appliedAt =
            applicant.recruitment
              .lastAppliedAt ||
            applicant.recruitment
              .firstAppliedAt ||
            applicant.createdAt;

          let matchesDate =
            true;

          if (
            dateFilter !==
              "All" &&
            appliedAt
          ) {
            const date =
              new Date(
                appliedAt
              );

            const age =
              filterNow -
              date.getTime();

            if (
              dateFilter ===
              "7d"
            ) {
              matchesDate =
                age <=
                7 *
                  24 *
                  60 *
                  60 *
                  1000;
            }

            if (
              dateFilter ===
              "30d"
            ) {
              matchesDate =
                age <=
                30 *
                  24 *
                  60 *
                  60 *
                  1000;
            }
          }

          return (
            matchesQuery &&
            matchesStatus &&
            matchesDate
          );
        }
      );
    }, [
      applicants,
      searchQuery,
      statusFilter,
      dateFilter,
      filterNow,
    ]);

  if (
    loading &&
    applicants.length === 0
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-12 text-center text-red-600">
        <FileText className="h-10 w-10" />

        <p className="mt-3 font-semibold">
          Error Loading Applicants
        </p>

        <p className="mt-1 text-sm">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            void loadApplicants()
          }
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Applicants" />

      <div className="-mt-3 flex flex-col gap-4 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Master Applicant profiles with preserved submission history.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {applicants.length} loaded
            {" · "}
            {filteredApplicants.length} shown
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            void loadApplicants()
          }
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading
            ? "Refreshing..."
            : "Refresh Applicants"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            placeholder="Search name, email, phone, position, skills..."
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-4 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | "All"
                  | ApplicantStatus
              )
            }
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="All">
              All Stages
            </option>

            {ALL_STATUSES.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>

          <select
            value={lifecycleFilter}
            onChange={(event) =>
              setLifecycleFilter(
                event.target
                  .value as
                  ApplicantLifecycleFilter
              )
            }
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="false">
              Active
            </option>
            <option value="true">
              Archived
            </option>
            <option value="all">
              All
            </option>
          </select>

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="All">
              All Time
            </option>
            <option value="7d">
              Last 7 Days
            </option>
            <option value="30d">
              Last 30 Days
            </option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3.5">
                Applicant
              </th>

              <th className="px-5 py-3.5">
                Phone
              </th>

              <th className="px-5 py-3.5">
                Position
              </th>

              <th className="px-5 py-3.5">
                Education
              </th>

              <th className="px-5 py-3.5">
                Last Applied
              </th>

              <th className="px-5 py-3.5">
                Status
              </th>

              <th className="px-5 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredApplicants.length ===
            0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-slate-400"
                >
                  No Applicant profiles match the current filters.
                </td>
              </tr>
            ) : (
              filteredApplicants.map(
                (applicant) => (
                  <tr
                    key={
                      applicant._id
                    }
                    className="hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-800">
                        {
                          applicant
                            .identity
                            .fullName
                        }
                      </span>

                      <span className="block text-[10px] text-slate-400">
                        {
                          applicant
                            .identity
                            .email
                        }
                      </span>

                      {applicant.lifecycle
                        .archived && (
                        <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                          Archived
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {applicant
                        .identity
                        .phoneNumber ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {
                            applicant
                              .identity
                              .phoneNumber
                          }
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-800">
                        {applicant
                          .preferences
                          .positionTrack ||
                          "—"}
                      </span>

                      <span className="block text-[10px] text-blue-600">
                        {applicant
                          .preferences
                          .positionType ||
                          "—"}
                      </span>
                    </td>

                    <td className="max-w-[180px] px-5 py-4 text-slate-600">
                      <span className="block truncate">
                        {applicant
                          .education
                          .universityName ||
                          "—"}
                      </span>

                      <span className="block truncate text-[10px] text-slate-400">
                        {applicant
                          .education
                          .major ||
                          applicant
                            .education
                            .degreeLevel ||
                          ""}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />

                        {formatDate(
                          applicant
                            .recruitment
                            .lastAppliedAt ||
                            applicant
                              .recruitment
                              .firstAppliedAt ||
                            applicant.createdAt
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <select
                        disabled={
                          applicant
                            .lifecycle
                            .archived
                        }
                        value={
                          applicant
                            .recruitment
                            .status
                        }
                        onChange={(
                          event
                        ) =>
                          void handleStatusChange(
                            applicant,
                            event.target
                              .value as
                              ApplicantStatus
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold disabled:bg-slate-100"
                      >
                        {allowedStatuses(
                          applicant
                            .recruitment
                            .status
                        ).map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedApplicant(
                              applicant
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          title="View Applicant"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>

                        {applicant
                          .lifecycle
                          .archived ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleRestore(
                                applicant
                              )
                            }
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                            title="Restore Applicant"
                          >
                            <RotateCcw className="h-4.5 w-4.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void handleArchive(
                                applicant
                              )
                            }
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                            title="Archive Applicant"
                          >
                            <Archive className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {selectedApplicant && (
        <ApplicantProfilePanel
          applicant={
            selectedApplicant
          }
          onClose={() =>
            setSelectedApplicant(
              null
            )
          }
          onChanged={
            loadApplicants
          }
        />
      )}
    </div>
  );
}

