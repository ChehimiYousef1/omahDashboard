import {
  CheckCircle2,
  Clock3,
  FileText,
  GitCompareArrows,
  History,
} from "lucide-react";

import {
  type ApplicantFormSubmission,
  type ApplicantSubmissionHistoryItem,
  type ApplicantSubmissionHistorySummary,
} from "../../services/api";


interface ApplicantSubmissionHistoryPanelProps {
  submissions:
    ApplicantFormSubmission[];

  history:
    ApplicantSubmissionHistoryItem[];

  summary:
    ApplicantSubmissionHistorySummary;

  loading:
    boolean;
}


type SubmissionWithMetadata =
  ApplicantFormSubmission & {
    source?: string;
    formVersion?: number;
    submittedAt?: string;
    createdAt?: string;
    submissionKey?: string;
    rawResponse?:
      Record<string, unknown>;

    documents?: {
      cvResume?: string;

      identityDocument?:
        string;

      enrollmentDocument?:
        string;

      degreeCertificate?:
        string;

      trainingCertificates?:
        string[];

      recommendationLetters?:
        string[];

      portfolioWorkSamples?:
        string[];

      additionalSupportingDocuments?:
        string[];
    };
  };


function displayValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value
          .map(
            (item) =>
              displayValue(item)
          )
          .join(", ")
      : "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}


function sourceLabel(
  source?: string
) {
  switch (source) {
    case "google-form":
      return "Google Form";

    case "manual":
      return "Manual";

    case "api":
      return "API";

    default:
      return source || "Unknown";
  }
}


function statusLabel(
  status:
    ApplicantSubmissionHistoryItem[
      "comparison"
    ]["status"]
) {
  if (status === "initial") {
    return "Initial Submission";
  }

  if (status === "changed") {
    return "Changed";
  }

  return "Matches Current";
}


function statusClasses(
  status:
    ApplicantSubmissionHistoryItem[
      "comparison"
    ]["status"]
) {
  if (status === "initial") {
    return (
      "bg-slate-100 " +
      "text-slate-700"
    );
  }

  if (status === "changed") {
    return (
      "bg-amber-50 " +
      "text-amber-700"
    );
  }

  return (
    "bg-emerald-50 " +
    "text-emerald-700"
  );
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


function documentLinks(
  submission:
    SubmissionWithMetadata
) {
  const docs =
    submission.documents;

  if (!docs) {
    return [];
  }

  const values: Array<{
    label: string;
    url: string;
  }> = [];

  const add =
    (
      label: string,
      value:
        | string
        | string[]
        | undefined
    ) => {
      const list =
        Array.isArray(value)
          ? value
          : value
            ? [value]
            : [];

      list.forEach(
        (url, index) => {
          if (
            !isSafeDocumentUrl(
              url
            )
          ) {
            return;
          }

          values.push({
            label:
              list.length > 1
                ? `${label} ${
                    index + 1
                  }`
                : label,

            url,
          });
        }
      );
    };

  add(
    "View CV",
    docs.cvResume
  );

  add(
    "Identity Document",
    docs.identityDocument
  );

  add(
    "Enrollment Document",
    docs.enrollmentDocument
  );

  add(
    "Degree Certificate",
    docs.degreeCertificate
  );

  add(
    "Training Certificate",
    docs.trainingCertificates
  );

  add(
    "Recommendation Letter",
    docs.recommendationLetters
  );

  add(
    "Work Sample",
    docs.portfolioWorkSamples
  );

  add(
    "Supporting Document",
    docs.additionalSupportingDocuments
  );

  return values;
}


export function ApplicantSubmissionHistoryPanel({
  submissions,
  history,
  summary,
  loading,
}: ApplicantSubmissionHistoryPanelProps) {
  if (loading) {
    return (
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-400">
          Loading submission history...
        </p>
      </section>
    );
  }

  if (
    submissions.length === 0
  ) {
    return (
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />

          <h3 className="text-sm font-bold text-slate-900">
            Submission History
          </h3>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          No linked submissions.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />

            <h3 className="text-sm font-bold text-slate-900">
              Submission History
            </h3>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Read-only history of every
            linked application submission.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <SummaryBadge
            label="Total"
            value={summary.total}
          />

          <SummaryBadge
            label="Changed"
            value={summary.changed}
          />

          <SummaryBadge
            label="Matches Current"
            value={
              summary.matchesCurrent
            }
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">
                Submitted
              </th>

              <th className="px-4 py-3">
                Source
              </th>

              <th className="px-4 py-3">
                Status
              </th>

              <th className="px-4 py-3">
                Differences
              </th>

              <th className="px-4 py-3">
                Reference
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {history.map(
              ({
                submission,
                comparison,
              }) => {
                const record =
                  submission as
                    SubmissionWithMetadata;

                const submittedAt =
                  record.submittedAt ||
                  record.createdAt;

                return (
                  <tr
                    key={
                      String(
                        (
                          submission as {
                            _id?: unknown;
                          }
                        )._id
                      )
                    }
                    className="align-top"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />

                        {submittedAt
                          ? new Date(
                              submittedAt
                            ).toLocaleString()
                          : "Unavailable"}
                      </div>

                      {record.formVersion !==
                        undefined && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Form v
                          {
                            record.formVersion
                          }
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-700">
                      {sourceLabel(
                        record.source
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold " +
                          statusClasses(
                            comparison.status
                          )
                        }
                      >
                        {statusLabel(
                          comparison.status
                        )}
                      </span>

                      {comparison
                        .isLatestApprovedSource && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Latest approved source
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-xs font-bold text-slate-800">
                        {
                          comparison
                            .changeCount
                        }
                      </span>

                      <span className="ml-1 text-[10px] text-slate-400">
                        field
                        {comparison
                          .changeCount ===
                        1
                          ? ""
                          : "s"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-mono text-[10px] text-slate-400">
                        {record
                          .submissionKey ||
                          "—"}
                      </span>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4">
        {history.map(
          (
            {
              submission,
              comparison,
            },
            index
          ) => {
            const record =
              submission as
                SubmissionWithMetadata;

            const docs =
              documentLinks(
                record
              );

            return (
              <details
                key={
                  "detail-" +
                  String(
                    (
                      submission as {
                        _id?: unknown;
                      }
                    )._id
                  )
                }
                className="rounded-xl border border-slate-100"
              >
                <summary className="cursor-pointer list-none px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Submission{" "}
                        {
                          history.length -
                          index
                        }
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {statusLabel(
                          comparison.status
                        )}
                        {" · "}
                        {
                          comparison
                            .changeCount
                        }{" "}
                        difference
                        {comparison
                          .changeCount ===
                        1
                          ? ""
                          : "s"}{" "}
                        from current
                        profile
                      </p>
                    </div>

                    <GitCompareArrows className="h-4 w-4 text-slate-400" />
                  </div>
                </summary>

                <div className="border-t border-slate-100 p-4">
                  {comparison
                    .changedFields
                    .length > 0 ? (
                    <>
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Profile Differences
                      </h4>

                      <div className="mt-3 space-y-3">
                        {comparison
                          .changedFields
                          .map(
                            (
                              field
                            ) => (
                              <div
                                key={
                                  field
                                    .applicantPath
                                }
                                className="grid gap-3 rounded-lg bg-amber-50/50 p-3 sm:grid-cols-2"
                              >
                                <div>
                                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                    Submitted
                                    —{" "}
                                    {
                                      field.label
                                    }
                                  </span>

                                  <span className="mt-1 block break-words text-xs text-slate-700">
                                    {displayValue(
                                      field
                                        .submittedValue
                                    )}
                                  </span>
                                </div>

                                <div>
                                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                    Current
                                    Profile
                                  </span>

                                  <span className="mt-1 block break-words text-xs font-semibold text-slate-800">
                                    {displayValue(
                                      field
                                        .currentValue
                                    )}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                      This submission
                      matches the current
                      profile across all
                      compared fields.
                    </div>
                  )}

                  {record.rawResponse &&
                    Object.keys(
                      record.rawResponse
                    ).length > 0 && (
                    <details className="mt-4 rounded-lg border border-slate-100 bg-slate-50">
                      <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-700">
                        View All Original
                        Form Answers
                      </summary>

                      <div className="border-t border-slate-100 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Object.entries(
                            record.rawResponse
                          ).map(
                            ([
                              question,
                              answer,
                            ]) => (
                              <div
                                key={
                                  question
                                }
                                className="rounded-lg bg-white p-3"
                              >
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  {
                                    question
                                  }
                                </span>

                                <span className="mt-1 block whitespace-pre-wrap break-words text-xs text-slate-700">
                                  {displayValue(
                                    answer
                                  )}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </details>
                  )}

                  {docs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Submission
                        Documents
                      </h4>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {docs.map(
                          (
                            document
                          ) => (
                            <a
                              key={
                                document
                                  .label +
                                document
                                  .url
                              }
                              href={
                                document.url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700"
                            >
                              <FileText className="h-3.5 w-3.5" />

                              {
                                document.label
                              }
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            );
          }
        )}
      </div>
    </section>
  );
}


function SummaryBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <span className="mt-0.5 block text-sm font-bold text-slate-800">
        {value}
      </span>
    </div>
  );
}
