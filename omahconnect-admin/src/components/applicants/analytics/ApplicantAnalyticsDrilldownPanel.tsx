import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  UserRoundSearch,
  X,
} from "lucide-react";

import {
  fetchApplicantAnalyticsDrilldown,
  type ApplicantAnalyticsDrilldownResponse,
  type ApplicantAnalyticsDrilldownType,
  type ApplicantSearchQuery,
} from "../../../services/api";


interface ApplicantAnalyticsDrilldownPanelProps {
  type:
    ApplicantAnalyticsDrilldownType;

  filters:
    ApplicantSearchQuery;

  onClose: () => void;

  onOpenApplicant?: (
    applicantId: string
  ) =>
    void |
    Promise<void>;
}


function statusLabel(
  value: string
) {
  const labels:
    Record<
      string,
      string
    > = {
      applied:
        "New",

      reviewed:
        "Under Review",

      shortlisted:
        "Shortlisted",

      interview:
        "Interview",

      offered:
        "Offered",

      hired:
        "Hired",

      rejected:
        "Rejected",
    };

  return labels[value] ||
    value ||
    "—";
}


function formatDate(
  value:
    string |
    null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "—"
    : date.toLocaleString();
}


export function ApplicantAnalyticsDrilldownPanel({
  type,
  filters,
  onClose,
  onOpenApplicant,
}: ApplicantAnalyticsDrilldownPanelProps) {
  const [
    result,
    setResult,
  ] = useState<
    ApplicantAnalyticsDrilldownResponse |
    null
  >(null);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string |
    null
  >(null);

  const [
    openingId,
    setOpeningId,
  ] = useState<
    string |
    null
  >(null);


  const load =
    useCallback(
      async (
        requestedPage =
          page
      ) => {
        try {
          setLoading(true);
          setError(null);

          const response =
            await fetchApplicantAnalyticsDrilldown(
              type,
              filters,
              requestedPage,
              50
            );

          setResult(
            response
          );

          setPage(
            response
              .pagination
              .page
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Applicant drill-down."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        filters,
        page,
        type,
      ]
    );


  useEffect(() => {
    setPage(1);

    void load(1);
  }, [
    type,
    filters,
  ]); // eslint-disable-line react-hooks/exhaustive-deps


  async function openApplicant(
    applicantId: string
  ) {
    if (
      !onOpenApplicant
    ) {
      return;
    }

    try {
      setOpeningId(
        applicantId
      );

      await onOpenApplicant(
        applicantId
      );
    } finally {
      setOpeningId(
        null
      );
    }
  }


  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs">
      <div className="ml-auto flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <UserRoundSearch className="h-5 w-5 text-blue-600" />

                <h2 className="text-lg font-bold text-slate-900">
                  {
                    result?.label ||
                    "Applicant Drill-Down"
                  }
                </h2>
              </div>

              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                {
                  result?.description ||
                  "Loading exact operational Applicant records..."
                }
              </p>

              {result && (
                <p className="mt-2 text-[10px] font-semibold text-slate-400">
                  {
                    result.recordCount
                  }{" "}
                  record
                  {
                    result.recordCount ===
                    1
                      ? ""
                      : "s"
                  }
                  {" · "}
                  {
                    result.applicantCount
                  }{" "}
                  unique Applicant
                  {
                    result.applicantCount ===
                    1
                      ? ""
                      : "s"
                  }
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  void load(
                    page
                  )
                }
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Refresh drill-down"
              >
                <RefreshCw
                  className={
                    `h-4 w-4 ${
                      loading
                        ? "animate-spin"
                        : ""
                    }`
                  }
                />
              </button>

              <button
                type="button"
                onClick={
                  onClose
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close drill-down"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>


        <main className="flex-1 overflow-y-auto p-6">
          {loading &&
          !result ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />

                <strong>
                  Unable to load drill-down
                </strong>
              </div>

              <p className="mt-2 text-xs">
                {error}
              </p>
            </div>
          ) : !result ||
            result.items.length ===
              0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <UserRoundSearch className="mx-auto h-9 w-9 text-slate-300" />

              <h3 className="mt-3 text-sm font-bold text-slate-800">
                No matching records
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                No records match this condition in the current Applicant cohort.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.items.map(
                (
                  item,
                  index
                ) => {
                  if (
                    item.kind ===
                    "duplicate"
                  ) {
                    return (
                      <section
                        key={
                          item.id ||
                          index
                        }
                        className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700">
                                {
                                  item.confidence
                                }
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                                {
                                  item.status
                                }
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              Matching signals:{" "}
                              <strong>
                                {
                                  item.matchedSignals
                                    .join(
                                      ", "
                                    ) ||
                                  "identity match"
                                }
                              </strong>
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Detected:{" "}
                              {
                                formatDate(
                                  item.detectedAt
                                )
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {[
                            {
                              label:
                                "Applicant A",

                              applicant:
                                item.sourceApplicant,
                            },

                            {
                              label:
                                "Applicant B",

                              applicant:
                                item.candidateApplicant,
                            },
                          ].map(
                            entry => (
                              <div
                                key={
                                  entry.label
                                }
                                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                              >
                                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                  {
                                    entry.label
                                  }
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-800">
                                  {
                                    entry.applicant
                                      ?.fullName ||
                                    "Applicant"
                                  }
                                </p>

                                <p className="mt-1 text-[10px] text-slate-500">
                                  {
                                    entry.applicant
                                      ?.email ||
                                    "—"
                                  }
                                </p>

                                {entry.applicant && (
                                  <button
                                    type="button"
                                    disabled={
                                      openingId ===
                                      entry.applicant.id
                                    }
                                    onClick={() =>
                                      void openApplicant(
                                        entry
                                          .applicant!
                                          .id
                                      )
                                    }
                                    className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                                  >
                                    {
                                      openingId ===
                                      entry.applicant.id
                                        ? "Opening..."
                                        : "Open Applicant"
                                    }
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </section>
                    );
                  }


                  const applicant =
                    item.applicant;

                  return (
                    <section
                      key={
                        applicant.id
                      }
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {
                                applicant.fullName
                              }
                            </h3>

                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                              {
                                statusLabel(
                                  applicant.status
                                )
                              }
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              applicant.email ||
                              "No email"
                            }
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
                            <span>
                              Position:{" "}
                              <strong className="text-slate-600">
                                {
                                  applicant.positionTrack ||
                                  "—"
                                }
                              </strong>
                            </span>

                            <span>
                              Location:{" "}
                              <strong className="text-slate-600">
                                {
                                  [
                                    applicant.city,
                                    applicant.country,
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      ", "
                                    ) ||
                                  "—"
                                }
                              </strong>
                            </span>

                            {item.recordCount >
                              1 && (
                              <span>
                                Related records:{" "}
                                <strong className="text-slate-600">
                                  {
                                    item.recordCount
                                  }
                                </strong>
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-xs font-semibold text-amber-700">
                            {
                              item.reason
                            }
                          </p>

                          {item.missingFields
                            .length >
                            0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.missingFields.map(
                                field => (
                                  <span
                                    key={
                                      field
                                    }
                                    className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-semibold text-red-600"
                                  >
                                    {
                                      field
                                    }
                                  </span>
                                )
                              )}
                            </div>
                          )}

                          {item.latestAt && (
                            <p className="mt-2 text-[10px] text-slate-400">
                              Latest related record:{" "}
                              {
                                formatDate(
                                  item.latestAt
                                )
                              }
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={
                            openingId ===
                            applicant.id
                          }
                          onClick={() =>
                            void openApplicant(
                              applicant.id
                            )
                          }
                          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                        >
                          {
                            openingId ===
                            applicant.id
                              ? "Opening..."
                              : "Open Applicant"
                          }
                        </button>
                      </div>
                    </section>
                  );
                }
              )}
            </div>
          )}
        </main>


        {result &&
        result.pagination.pages >
          1 && (
          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4 text-xs">
            <span className="text-slate-500">
              Page{" "}
              {
                result.pagination
                  .page
              }{" "}
              of{" "}
              {
                result.pagination
                  .pages
              }
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  loading ||
                  result.pagination
                    .page <=
                    1
                }
                onClick={() =>
                  void load(
                    result
                      .pagination
                      .page -
                    1
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  loading ||
                  result.pagination
                    .page >=
                    result.pagination
                      .pages
                }
                onClick={() =>
                  void load(
                    result
                      .pagination
                      .page +
                    1
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
