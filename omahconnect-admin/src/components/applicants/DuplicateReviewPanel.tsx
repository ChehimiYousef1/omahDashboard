import {
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  fetchApplicantDuplicateCases,
  resolveApplicantDuplicateCase,
  type ApplicantDuplicateCase,
  type ApplicantDuplicateCaseStatus,
  type ApplicantMaster,
} from "../../services/api";


type QueueStatus =
  | ApplicantDuplicateCaseStatus
  | "all";


function applicantName(
  applicant:
    | ApplicantMaster
    | null
    | undefined,
  fallback: string
) {
  return (
    applicant?.identity
      ?.fullName ||
    fallback ||
    "Unknown Applicant"
  );
}


function ApplicantComparisonCard({
  title,
  applicant,
}: {
  title: string;
  applicant:
    | ApplicantMaster
    | null
    | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <h4 className="mt-2 text-sm font-bold text-slate-900">
        {applicantName(
          applicant,
          "Unknown Applicant"
        )}
      </h4>

      <div className="mt-3 space-y-2 text-xs text-slate-600">
        <p>
          <strong>Email:</strong>{" "}
          {applicant?.identity
            ?.email || "—"}
        </p>

        <p>
          <strong>Phone:</strong>{" "}
          {applicant?.identity
            ?.phoneNumber || "—"}
        </p>

        <p>
          <strong>Location:</strong>{" "}
          {[
            applicant?.identity?.city,
            applicant?.identity?.country,
          ]
            .filter(Boolean)
            .join(", ") || "—"}
        </p>

        <p>
          <strong>Position:</strong>{" "}
          {applicant?.preferences
            ?.positionTrack || "—"}
        </p>

        <p>
          <strong>University:</strong>{" "}
          {applicant?.education
            ?.universityName || "—"}
        </p>

        <p className="break-all">
          <strong>LinkedIn:</strong>{" "}
          {applicant?.profiles
            ?.linkedin || "—"}
        </p>
      </div>
    </div>
  );
}


export function DuplicateReviewPanel() {
  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    status,
    setStatus,
  ] =
    useState<QueueStatus>(
      "all"
    );

  const [
    duplicateCases,
    setDuplicateCases,
  ] =
    useState<
      ApplicantDuplicateCase[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    resolvingId,
    setResolvingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    notes,
    setNotes,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  async function loadCases(
    nextStatus:
      QueueStatus = status
  ) {
    try {
      setLoading(true);
      setError("");

      const result =
        await fetchApplicantDuplicateCases(
          {
            status:
              nextStatus,

            limit:
              100,
          }
        );

      setDuplicateCases(
        result.duplicateCases
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load duplicate cases."
      );
    } finally {
      setLoading(false);
    }
  }


  function openReview() {
    setOpen(true);
    void loadCases(
      status
    );
  }


  async function resolveCase(
    duplicateCase:
      ApplicantDuplicateCase,
    decision:
      | "same_person"
      | "not_duplicate"
      | "keep_separate"
  ) {
    if (
      decision ===
      "same_person"
    ) {
      const confirmed =
        window.confirm(
          "Mark these Applicants as the same person? This records the review decision only. It will NOT merge or delete either Applicant."
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      setResolvingId(
        duplicateCase._id
      );

      await resolveApplicantDuplicateCase(
        duplicateCase._id,
        {
          decision,

          notes:
            notes[
              duplicateCase._id
            ] || "",
        }
      );

      await loadCases(
        status
      );
    } catch (
      resolveError
    ) {
      window.alert(
        resolveError instanceof Error
          ? resolveError.message
          : "Could not resolve duplicate case."
      );
    } finally {
      setResolvingId(
        null
      );
    }
  }


  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={
            openReview
          }
          className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
        >
          <Users className="h-4 w-4" />
          Duplicate Review
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs">
          <div className="ml-auto flex h-full w-full max-w-6xl flex-col bg-slate-50 shadow-2xl">
            <header className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />

                    <h2 className="text-lg font-bold text-slate-900">
                      Duplicate Review
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Compare possible duplicate Applicants and record an administrative decision.
                  </p>

                  <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                    No action on this screen automatically merges or deletes Applicant records.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Close duplicate review"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
              <select
                value={
                  status
                }
                onChange={(
                  event
                ) => {
                  const next =
                    event.target
                      .value as
                      QueueStatus;

                  setStatus(
                    next
                  );

                  void loadCases(
                    next
                  );
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="all">
                  All Cases
                </option>

                <option value="open">
                  Open
                </option>

                <option value="under_review">
                  Under Review
                </option>

                <option value="resolved">
                  Resolved
                </option>
              </select>

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  void loadCases(
                    status
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
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

                Refresh
              </button>
            </div>

            <main className="flex-1 overflow-y-auto p-6">
              {loading &&
              duplicateCases.length ===
                0 ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  {error}
                </div>
              ) : duplicateCases.length ===
                0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
                  <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />

                  <h3 className="mt-3 text-sm font-bold text-slate-900">
                    No duplicate cases
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    No cases match the selected status.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {duplicateCases.map(
                    (
                      duplicateCase
                    ) => (
                      <section
                        key={
                          duplicateCase._id
                        }
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700">
                                {
                                  duplicateCase
                                    .confidence
                                }
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                                {
                                  duplicateCase
                                    .status
                                }
                              </span>

                              <span className="text-[10px] text-slate-400">
                                {
                                  duplicateCase
                                    .strongMatchCount
                                }{" "}
                                strong match
                                {
                                  duplicateCase
                                    .strongMatchCount ===
                                  1
                                    ? ""
                                    : "es"
                                }
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              Matching signals:{" "}
                              <strong>
                                {
                                  duplicateCase
                                    .matchedSignals
                                    .join(
                                      ", "
                                    )
                                }
                              </strong>
                            </p>
                          </div>

                          {duplicateCase
                            .status ===
                            "resolved" && (
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                              <ShieldCheck className="h-4 w-4" />

                              {
                                duplicateCase
                                  .resolution
                                  ?.decision
                              }
                            </div>
                          )}
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                          <ApplicantComparisonCard
                            title="Applicant A"
                            applicant={
                              duplicateCase
                                .sourceApplicant
                            }
                          />

                          <ApplicantComparisonCard
                            title="Applicant B"
                            applicant={
                              duplicateCase
                                .candidateApplicant
                            }
                          />
                        </div>

                        <div className="mt-4 rounded-lg bg-slate-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Detection Evidence
                          </p>

                          <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                            <div>
                              <strong>
                                Applicant A
                              </strong>

                              <p className="mt-1 break-all">
                                Email:{" "}
                                {
                                  duplicateCase
                                    .sourceEvidence
                                    ?.normalizedEmail ||
                                  "—"
                                }
                              </p>

                              <p className="break-all">
                                Phone:{" "}
                                {
                                  duplicateCase
                                    .sourceEvidence
                                    ?.normalizedPhone ||
                                  "—"
                                }
                              </p>

                              <p className="break-all">
                                LinkedIn:{" "}
                                {
                                  duplicateCase
                                    .sourceEvidence
                                    ?.linkedinCanonical ||
                                  "—"
                                }
                              </p>
                            </div>

                            <div>
                              <strong>
                                Applicant B
                              </strong>

                              <p className="mt-1 break-all">
                                Email:{" "}
                                {
                                  duplicateCase
                                    .candidateEvidence
                                    ?.normalizedEmail ||
                                  "—"
                                }
                              </p>

                              <p className="break-all">
                                Phone:{" "}
                                {
                                  duplicateCase
                                    .candidateEvidence
                                    ?.normalizedPhone ||
                                  "—"
                                }
                              </p>

                              <p className="break-all">
                                LinkedIn:{" "}
                                {
                                  duplicateCase
                                    .candidateEvidence
                                    ?.linkedinCanonical ||
                                  "—"
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {duplicateCase
                          .status !==
                          "resolved" ? (
                          <div className="mt-5">
                            <label className="block">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Review Notes
                              </span>

                              <textarea
                                value={
                                  notes[
                                    duplicateCase
                                      ._id
                                  ] || ""
                                }
                                maxLength={
                                  2000
                                }
                                onChange={(
                                  event
                                ) =>
                                  setNotes(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [duplicateCase
                                        ._id]:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                rows={
                                  3
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                                placeholder="Optional review notes..."
                              />
                            </label>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  resolvingId ===
                                  duplicateCase
                                    ._id
                                }
                                onClick={() =>
                                  void resolveCase(
                                    duplicateCase,
                                    "same_person"
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Same Person
                              </button>

                              <button
                                type="button"
                                disabled={
                                  resolvingId ===
                                  duplicateCase
                                    ._id
                                }
                                onClick={() =>
                                  void resolveCase(
                                    duplicateCase,
                                    "not_duplicate"
                                  )
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Not Duplicate
                              </button>

                              <button
                                type="button"
                                disabled={
                                  resolvingId ===
                                  duplicateCase
                                    ._id
                                }
                                onClick={() =>
                                  void resolveCase(
                                    duplicateCase,
                                    "keep_separate"
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                              >
                                Keep Separate
                              </button>
                            </div>

                            <p className="mt-2 text-[10px] text-slate-400">
                              “Same Person” records the review conclusion only. No records are merged automatically.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-xs font-bold text-emerald-800">
                              Review resolved:{" "}
                              {
                                duplicateCase
                                  .resolution
                                  ?.decision
                              }
                            </p>

                            {duplicateCase
                              .resolution
                              ?.notes && (
                              <p className="mt-2 whitespace-pre-wrap text-xs text-emerald-700">
                                {
                                  duplicateCase
                                    .resolution
                                    .notes
                                }
                              </p>
                            )}
                          </div>
                        )}
                      </section>
                    )
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
