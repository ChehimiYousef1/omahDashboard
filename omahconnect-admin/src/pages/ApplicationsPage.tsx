import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  archiveApplicant,
  fetchApplicantMaster,
  fetchApplicantPipeline,
  fetchApplicantSearchOptions,
  permanentlyDeleteApplicant,
  restoreApplicant,
  searchApplicantMasters,
  updateApplicantStatus,
  type ApplicantMaster,
  type ApplicantPagination,
  type ApplicantPipelineDefinition,
  type ApplicantSearchOptions,
  type ApplicantSearchQuery,
  type ApplicantStatus,
} from "../services/api";

import { Header } from "../components/layout/Header";

import { ApplicantProfilePanel } from "../components/applicants/ApplicantProfilePanel";
import { AdvancedApplicantFilters } from "../components/applicants/AdvancedApplicantFilters";
import { DuplicateReviewPanel } from "../components/applicants/DuplicateReviewPanel";
import { ApplicantPipelineBoard } from "../components/applicants/ApplicantPipelineBoard";
import { ApplicantAnalyticsDashboard } from "../components/applicants/ApplicantAnalyticsDashboard";

import {
  Archive,
  Calendar,
  Eye,
  FileText,
  Loader2,
  Phone,
  RotateCcw,
  Trash2,
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

const DEFAULT_APPLICANT_FILTERS:
  ApplicantSearchQuery = {
    archived: "false",
    sortBy: "lastActivityAt",
    sortOrder: "desc",
    page: 1,
    limit: 25,
  };

const DEFAULT_PAGINATION:
  ApplicantPagination = {
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  };

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
    viewMode,
    setViewMode,
  ] = useState<
    "table" | "pipeline" | "analytics"
  >("table");

  const [
    duplicateReviewRequestKey,
    setDuplicateReviewRequestKey,
  ] = useState(0);

  const [
    pipelineApplicants,
    setPipelineApplicants,
  ] = useState<
    ApplicantMaster[]
  >([]);

  const [
    pipelineLoading,
    setPipelineLoading,
  ] = useState(false);

  const [
    pipelineError,
    setPipelineError,
  ] = useState<
    string | null
  >(null);

  const [
    pipelineTotal,
    setPipelineTotal,
  ] = useState(0);

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
    filters,
    setFilters,
  ] = useState<ApplicantSearchQuery>(
    DEFAULT_APPLICANT_FILTERS
  );

  const [
    requestFilters,
    setRequestFilters,
  ] = useState<ApplicantSearchQuery>(
    DEFAULT_APPLICANT_FILTERS
  );

  const [
    pagination,
    setPagination,
  ] = useState<ApplicantPagination>(
    DEFAULT_PAGINATION
  );

  const [
    searchOptions,
    setSearchOptions,
  ] = useState<
    ApplicantSearchOptions | null
  >(null);


  const [
    pipeline,
    setPipeline,
  ] = useState<
    ApplicantPipelineDefinition | null
  >(null);

  const [
    optionsLoading,
    setOptionsLoading,
  ] = useState(true);

  const [
    optionsError,
    setOptionsError,
  ] = useState<
    string | null
  >(null);

  /*
   * Debounce filter changes so free-text
   * search does not issue one request for
   * every keyboard event.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setRequestFilters(
          filters
        );
      }, 350);

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [filters]);

  const loadApplicants =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const result =
            await searchApplicantMasters(
              requestFilters
            );

          setApplicants(
            result.applicants
          );

          setPagination(
            result.pagination
          );
        } catch (err) {
          setError(
            errorMessage(err)
          );
        } finally {
          setLoading(false);
        }
      },
      [requestFilters]
    );

  const loadPipelineApplicants =
    useCallback(
      async () => {
        try {
          setPipelineLoading(
            true
          );

          setPipelineError(
            null
          );

          const result =
            await searchApplicantMasters({
              ...requestFilters,
              page: 1,
              limit: 200,
            });

          setPipelineApplicants(
            result.applicants
          );

          setPipelineTotal(
            result.pagination.total
          );
        } catch (err) {
          setPipelineError(
            errorMessage(err)
          );
        } finally {
          setPipelineLoading(
            false
          );
        }
      },
      [requestFilters]
    );


  useEffect(() => {
    // Server-side Applicant search load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadApplicants();
  }, [loadApplicants]);

  useEffect(() => {
    if (
      viewMode !==
      "pipeline"
    ) {
      return;
    }

    void loadPipelineApplicants();
  }, [
    viewMode,
    loadPipelineApplicants,
  ]);


  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        setOptionsLoading(true);
        setOptionsError(null);

        const [
          options,
          pipelineDefinition,
        ] =
          await Promise.all([
            fetchApplicantSearchOptions(),
            fetchApplicantPipeline(),
          ]);

        if (active) {
          setSearchOptions(
            options
          );

          setPipeline(
            pipelineDefinition
          );
        }
      } catch (err) {
        if (active) {
          setOptionsError(
            errorMessage(err)
          );
        }
      } finally {
        if (active) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  function resetFilters() {
    setFilters({
      ...DEFAULT_APPLICANT_FILTERS,
    });
  }


  function openApplicantsFromAnalytics(
    filterPatch:
      Partial<ApplicantSearchQuery>
  ) {
    setFilters(
      current => ({
        ...current,
        ...filterPatch,
        page: 1,
      })
    );

    setViewMode(
      "table"
    );
  }


  function openDuplicateReviewFromAnalytics() {
    setDuplicateReviewRequestKey(
      current =>
        current + 1
    );
  }


  async function openApplicantFromAnalytics(
    applicantId: string
  ) {
    try {
      const applicant =
        await fetchApplicantMaster(
          applicantId
        );

      setSelectedApplicant(
        applicant
      );
    } catch (openError) {
      window.alert(
        errorMessage(
          openError
        )
      );
    }
  }

  function changePage(
    nextPage: number
  ) {
    if (
      nextPage < 1 ||
      (
        pagination.pages > 0 &&
        nextPage >
          pagination.pages
      )
    ) {
      return;
    }

    setFilters(
      (current) => ({
        ...current,
        page: nextPage,
      })
    );
  }

  async function handlePipelineMove(
    applicant:
      ApplicantMaster,
    nextStatus:
      ApplicantStatus
  ) {
    if (
      applicant
        .recruitment
        .status ===
      nextStatus
    ) {
      return;
    }

    try {
      await updateApplicantStatus(
        applicant._id,
        nextStatus
      );

      await Promise.all([
        loadApplicants(),
        loadPipelineApplicants(),
      ]);
    } catch (err) {
      window.alert(
        errorMessage(err)
      );
    }
  }


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

  async function handlePermanentDelete(
    applicant:
      ApplicantMaster
  ) {
    if (
      applicant.lifecycle
        .archived !== true
    ) {
      window.alert(
        "Archive the Applicant before permanent deletion."
      );

      return;
    }

    const fullName =
      applicant.identity
        .fullName ||
      "this Applicant";

    const confirmation =
      window.prompt(
        `Permanently delete ${fullName}?\n\nThis removes the Applicant, managed documents, evaluations, interviews, duplicate cases and activity records.\n\nImmutable Form submissions remain preserved.\n\nType DELETE to confirm:`,
        ""
      );

    if (
      confirmation !==
      "DELETE"
    ) {
      return;
    }

    try {
      await permanentlyDeleteApplicant(
        applicant._id
      );

      setSelectedApplicant(
        null
      );

      await loadApplicants();

      /*
       * Search/filter options can contain values
       * contributed only by the deleted Applicant,
       * so refresh them as well.
       */
      try {
        const options =
          await fetchApplicantSearchOptions();

        setSearchOptions(
          options
        );
      } catch {
        /*
         * Deletion itself already succeeded.
         * A filter refresh failure must not be
         * reported as a deletion failure.
         */
      }
    } catch (deleteError) {
      window.alert(
        errorMessage(
          deleteError
        )
      );
    }
  }


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
    <div className="space-y-4">
      <Header title="Applicants" />

      <div className="-mt-3 flex flex-col gap-4 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Master Applicant profiles with preserved submission history.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {pagination.total} total
            {" · "}
            {applicants.length} on this page
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

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setViewMode(
                "table"
              )
            }
            className={
              `rounded-md px-3 py-1.5 text-xs font-semibold ${
                viewMode ===
                "table"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            Table View
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                "pipeline"
              )
            }
            className={
              `rounded-md px-3 py-1.5 text-xs font-semibold ${
                viewMode ===
                "pipeline"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            Pipeline View
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                "analytics"
              )
            }
            className={
              `rounded-md px-3 py-1.5 text-xs font-semibold ${
                viewMode ===
                "analytics"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            Analytics View
          </button>
        </div>

        <div className="flex items-center gap-3">
          {
            viewMode ===
              "pipeline" && (
              <p className="hidden text-[10px] text-slate-400 lg:block">
                Drag cards only to allowed stages.
              </p>
            )
          }

          <DuplicateReviewPanel
            openRequestKey={
              duplicateReviewRequestKey
            }
          />
        </div>
      </div>

      <AdvancedApplicantFilters
        filters={filters}
        options={searchOptions}
        pipeline={pipeline}
        loading={optionsLoading}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {optionsError && (
        <p className="-mt-3 text-xs text-amber-600">
          Filter options could not be refreshed:
          {" "}
          {optionsError}
        </p>
      )}

      {viewMode === "analytics" ? (
        <ApplicantAnalyticsDashboard
          filters={
            requestFilters
          }

          onViewApplicants={
            openApplicantsFromAnalytics
          }

          onOpenDuplicateReview={
            openDuplicateReviewFromAnalytics
          }

          onOpenApplicant={
            openApplicantFromAnalytics
          }
        />
      ) : viewMode === "pipeline" ? (
        <ApplicantPipelineBoard
          applicants={
            pipelineApplicants
          }

          pipeline={
            pipeline
          }

          loading={
            pipelineLoading
          }

          error={
            pipelineError
          }

          total={
            pipelineTotal
          }

          onMove={
            handlePipelineMove
          }

          onOpenApplicant={
            setSelectedApplicant
          }
        />
      ) : (
        <>
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
            {applicants.length ===
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
              applicants.map(
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
                        {[
                          applicant
                            .recruitment
                            .status,
                          ...(
                            pipeline
                              ?.transitions[
                                applicant
                                  .recruitment
                                  .status
                              ] || []
                          ),
                        ].map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {
                                pipeline
                                  ?.stages.find(
                                    (
                                      stage
                                    ) =>
                                      stage
                                        .value ===
                                      status
                                  )
                                  ?.label ||
                                status
                              }
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
                          <div className="flex items-center gap-1">
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

                            <button
                              type="button"
                              onClick={() =>
                                void handlePermanentDelete(
                                  applicant
                                )
                              }
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                              title="Delete Applicant Permanently"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
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

      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-slate-500">
          {pagination.total === 0
            ? "No applicants"
            : (
              <>
                Page{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.page}
                </span>
                {" "}of{" "}
                <span className="font-semibold text-slate-700">
                  {pagination.pages}
                </span>
                {" · "}
                {pagination.total} total
              </>
            )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={
              loading ||
              pagination.page <= 1
            }
            onClick={() =>
              changePage(
                pagination.page - 1
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              loading ||
              pagination.pages === 0 ||
              pagination.page >=
                pagination.pages
            }
            onClick={() =>
              changePage(
                pagination.page + 1
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

        </>
      )}

      {selectedApplicant && (
        <ApplicantProfilePanel
          applicant={
            selectedApplicant
          }

          pipeline={
            pipeline
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

