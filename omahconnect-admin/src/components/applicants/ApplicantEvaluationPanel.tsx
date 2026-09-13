import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Edit3,
  Save,
  Send,
  Star,
} from "lucide-react";

import {
  createApplicantEvaluation,
  fetchApplicantEvaluations,
  submitApplicantEvaluation,
  updateApplicantEvaluation,
  type ApplicantEvaluation,
  type ApplicantEvaluationCriteria,
  type ApplicantEvaluationRecommendation,
  type ApplicantFormSubmission,
  type ApplicantMaster,
} from "../../services/api";


interface ApplicantEvaluationPanelProps {
  applicant:
    ApplicantMaster;

  submissions:
    ApplicantFormSubmission[];

  loadingSubmissions:
    boolean;
}


const CRITERIA: Array<{
  key:
    keyof ApplicantEvaluationCriteria;

  label:
    string;

  weight:
    number;

  description:
    string;
}> = [
  {
    key:
      "technicalFit",

    label:
      "Technical Fit",

    weight:
      30,

    description:
      "Technical knowledge and fit for the target role.",
  },

  {
    key:
      "relevantExperience",

    label:
      "Relevant Experience",

    weight:
      20,

    description:
      "Relevant academic, project, internship, or professional experience.",
  },

  {
    key:
      "communication",

    label:
      "Communication",

    weight:
      15,

    description:
      "Clarity, professionalism, and ability to communicate effectively.",
  },

  {
    key:
      "motivationCommitment",

    label:
      "Motivation & Commitment",

    weight:
      15,

    description:
      "Interest in the opportunity and ability to commit.",
  },

  {
    key:
      "learningPotential",

    label:
      "Learning Potential",

    weight:
      20,

    description:
      "Ability to learn, improve, and adapt to new challenges.",
  },
];


const EMPTY_CRITERIA:
  ApplicantEvaluationCriteria =
{
  technicalFit: 0,
  relevantExperience: 0,
  communication: 0,
  motivationCommitment: 0,
  learningPotential: 0,
};


const RECOMMENDATIONS:
  Array<{
    value:
      ApplicantEvaluationRecommendation;

    label:
      string;
  }> = [
    {
      value:
        "strong_yes",

      label:
        "Strong Yes",
    },

    {
      value:
        "yes",

      label:
        "Yes",
    },

    {
      value:
        "hold",

      label:
        "Hold",
    },

    {
      value:
        "no",

      label:
        "No",
    },

    {
      value:
        "strong_no",

      label:
        "Strong No",
    },
  ];


function errorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error ===
      "object" &&
    "response" in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              error?:
                string;
            };
          };
        }
      ).response;

    if (
      response?.data?.error
    ) {
      return response
        .data
        .error;
    }
  }

  return error
    instanceof Error
    ? error.message
    : "Unexpected error";
}


function formatDateTime(
  value:
    string |
    null |
    undefined
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

  return date
    .toLocaleString();
}


function recommendationLabel(
  value:
    ApplicantEvaluationRecommendation
) {
  return (
    RECOMMENDATIONS.find(
      (item) =>
        item.value ===
        value
    )?.label ||
    value
  );
}


function weightedPreview(
  criteria:
    ApplicantEvaluationCriteria
) {
  const complete =
    CRITERIA.every(
      (criterion) =>
        criteria[
          criterion.key
        ] >= 1 &&
        criteria[
          criterion.key
        ] <= 5
    );

  if (!complete) {
    return null;
  }

  const score =
    CRITERIA.reduce(
      (
        total,
        criterion
      ) =>
        total +
        (
          criteria[
            criterion.key
          ] /
          5
        ) *
          criterion.weight,
      0
    );

  return Number(
    score.toFixed(2)
  );
}


function averagePreview(
  criteria:
    ApplicantEvaluationCriteria
) {
  const values =
    Object.values(
      criteria
    );

  if (
    values.some(
      (value) =>
        value < 1 ||
        value > 5
    )
  ) {
    return null;
  }

  return Number(
    (
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      values.length
    ).toFixed(2)
  );
}


function submissionLabel(
  submission:
    ApplicantFormSubmission,
  index:
    number
) {
  const date =
    submission.submittedAt
      ? formatDateTime(
          submission
            .submittedAt
        )
      : "date unavailable";

  return (
    `Submission ${
      index + 1
    } — ${date}`
  );
}


export function ApplicantEvaluationPanel({
  applicant,
  submissions,
  loadingSubmissions,
}: ApplicantEvaluationPanelProps) {
  const [
    evaluations,
    setEvaluations,
  ] =
    useState<
      ApplicantEvaluation[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    editingEvaluationId,
    setEditingEvaluationId,
  ] =
    useState<
      string | null
    >(null);

  const [
    submissionId,
    setSubmissionId,
  ] =
    useState("");

  const [
    criteria,
    setCriteria,
  ] =
    useState<
      ApplicantEvaluationCriteria
    >({
      ...EMPTY_CRITERIA,
    });

  const [
    recommendation,
    setRecommendation,
  ] =
    useState<
      ApplicantEvaluationRecommendation |
      ""
    >("");

  const [
    strengths,
    setStrengths,
  ] =
    useState("");

  const [
    concerns,
    setConcerns,
  ] =
    useState("");

  const [
    summary,
    setSummary,
  ] =
    useState("");


  useEffect(
    () => {
      let active =
        true;

      async function load() {
        try {
          setLoading(
            true
          );

          const result =
            await fetchApplicantEvaluations(
              applicant._id
            );

          if (active) {
            setEvaluations(
              result
            );
          }
        } catch (error) {
          if (active) {
            window.alert(
              errorMessage(
                error
              )
            );
          }
        } finally {
          if (active) {
            setLoading(
              false
            );
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    },
    [
      applicant._id,
    ]
  );


  const approvedSubmissionId =
    applicant
      .latestApprovedSubmissionId;

  const defaultSubmissionId =
    approvedSubmissionId &&
    submissions.some(
      (submission) =>
        submission._id ===
        approvedSubmissionId
    )
      ? approvedSubmissionId
      : submissions[0]?._id ||
        "";

  const effectiveSubmissionId =
    submissionId ||
    defaultSubmissionId;


  async function refresh() {
    const result =
      await fetchApplicantEvaluations(
        applicant._id
      );

    setEvaluations(
      result
    );
  }


  function resetForm() {
    setEditingEvaluationId(
      null
    );

    const approved =
      applicant
        .latestApprovedSubmissionId;

    const approvedExists =
      approved &&
      submissions.some(
        (submission) =>
          submission._id ===
          approved
      );

    setSubmissionId(
      approvedExists
        ? approved
        : submissions[0]
          ?._id ||
          ""
    );

    setCriteria({
      ...EMPTY_CRITERIA,
    });

    setRecommendation(
      ""
    );

    setStrengths("");
    setConcerns("");
    setSummary("");
  }


  function setCriterion(
    key:
      keyof ApplicantEvaluationCriteria,
    value:
      number
  ) {
    setCriteria(
      (current) => ({
        ...current,
        [key]:
          value,
      })
    );
  }


  function validateForm() {
    if (!effectiveSubmissionId) {
      window.alert(
        "Select the Applicant submission being evaluated."
      );

      return false;
    }

    for (
      const criterion
      of CRITERIA
    ) {
      const score =
        criteria[
          criterion.key
        ];

      if (
        score < 1 ||
        score > 5
      ) {
        window.alert(
          `Score ${criterion.label} from 1 to 5.`
        );

        return false;
      }
    }

    if (!recommendation) {
      window.alert(
        "Select a recruiter recommendation."
      );

      return false;
    }

    return true;
  }


  async function saveDraft() {
    if (
      !validateForm() ||
      !recommendation
    ) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        criteria,
        recommendation,
        strengths,
        concerns,
        summary,
      };

      if (
        editingEvaluationId
      ) {
        await updateApplicantEvaluation(
          applicant._id,
          editingEvaluationId,
          payload
        );
      } else {
        await createApplicantEvaluation(
          applicant._id,
          {
            submissionId:
              effectiveSubmissionId,
            ...payload,
            status:
              "draft",
          }
        );
      }

      await refresh();

      resetForm();

      window.alert(
        "Evaluation draft saved."
      );
    } catch (error) {
      window.alert(
        errorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  }


  async function submitEvaluation() {
    if (
      !validateForm() ||
      !recommendation
    ) {
      return;
    }

    if (
      !window.confirm(
        "Submit this evaluation? Submitted evaluations become immutable."
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        criteria,
        recommendation,
        strengths,
        concerns,
        summary,
      };

      let evaluationId =
        editingEvaluationId;

      if (
        evaluationId
      ) {
        await updateApplicantEvaluation(
          applicant._id,
          evaluationId,
          payload
        );
      } else {
        const created =
          await createApplicantEvaluation(
            applicant._id,
            {
              submissionId:
                effectiveSubmissionId,
              ...payload,
              status:
                "draft",
            }
          );

        evaluationId =
          created._id;
      }

      await submitApplicantEvaluation(
        applicant._id,
        evaluationId
      );

      await refresh();

      resetForm();

      window.alert(
        "Evaluation submitted."
      );
    } catch (error) {
      window.alert(
        errorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  }


  function editDraft(
    evaluation:
      ApplicantEvaluation
  ) {
    if (
      evaluation.status !==
        "draft"
    ) {
      return;
    }

    setEditingEvaluationId(
      evaluation._id
    );

    setSubmissionId(
      evaluation
        .submissionId
    );

    setCriteria({
      ...evaluation
        .criteria,
    });

    setRecommendation(
      evaluation
        .recommendation
    );

    setStrengths(
      evaluation
        .strengths ||
      ""
    );

    setConcerns(
      evaluation
        .concerns ||
      ""
    );

    setSummary(
      evaluation
        .summary ||
      ""
    );

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }


  const previewScore =
    weightedPreview(
      criteria
    );

  const previewAverage =
    averagePreview(
      criteria
    );

  const submittedEvaluations =
    evaluations.filter(
      (evaluation) =>
        evaluation.status ===
        "submitted"
    );

  const submittedAverage =
    submittedEvaluations.length
      ? Number(
          (
            submittedEvaluations
              .reduce(
                (
                  total,
                  evaluation
                ) =>
                  total +
                  evaluation
                    .weightedScore,
                0
              ) /
            submittedEvaluations
              .length
          ).toFixed(2)
        )
      : null;


  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />

              <h3 className="text-sm font-bold text-slate-900">
                Applicant Evaluation & Rating
              </h3>
            </div>

            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Recruiter evaluations are separate from historical Google Form ratings.
              Scores and evaluator identity are validated by the server.
            </p>
          </div>

          {editingEvaluationId && (
            <button
              type="button"
              disabled={
                saving
              }
              onClick={
                resetForm
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel Edit
            </button>
          )}
        </div>


        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Evaluations
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {
                evaluations.length
              }
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Submitted
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {
                submittedEvaluations
                  .length
              }
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Submitted Avg.
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {submittedAverage ===
              null
                ? "—"
                : `${submittedAverage}/100`}
            </p>
          </div>
        </div>
      </section>


      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {editingEvaluationId
                ? "Edit Evaluation Draft"
                : "New Evaluation"}
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Rate each criterion from 1 to 5.
              The final weighted score is calculated automatically.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wide text-blue-500">
                Score
              </p>

              <p className="text-sm font-bold text-blue-700">
                {previewScore ===
                null
                  ? "—"
                  : `${previewScore}/100`}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Average
              </p>

              <p className="text-sm font-bold text-slate-700">
                {previewAverage ===
                null
                  ? "—"
                  : `${previewAverage}/5`}
              </p>
            </div>
          </div>
        </div>


        <div className="mt-5">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Application / Submission
            </span>

            <select
              value={
                effectiveSubmissionId
              }
              disabled={
                loadingSubmissions ||
                Boolean(
                  editingEvaluationId
                ) ||
                saving
              }
              onChange={(
                event
              ) =>
                setSubmissionId(
                  event
                    .target
                    .value
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
            >
              <option value="">
                Select a submission
              </option>

              {submissions.map(
                (
                  submission,
                  index
                ) => (
                  <option
                    key={
                      submission._id
                    }
                    value={
                      submission._id
                    }
                  >
                    {submissionLabel(
                      submission,
                      index
                    )}
                    {applicant
                      .latestApprovedSubmissionId ===
                    submission._id
                      ? " — Current approved source"
                      : ""}
                  </option>
                )
              )}
            </select>
          </label>

          {!loadingSubmissions &&
            submissions.length ===
              0 && (
              <p className="mt-2 text-xs text-amber-600">
                This Applicant has no linked submission available for evaluation.
              </p>
            )}
        </div>


        <div className="mt-6 space-y-4">
          {CRITERIA.map(
            (criterion) => {
              const value =
                criteria[
                  criterion.key
                ];

              return (
                <div
                  key={
                    criterion.key
                  }
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {
                          criterion.label
                        }
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {
                          criterion.description
                        }
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      {
                        criterion.weight
                      }%
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      1,
                      2,
                      3,
                      4,
                      5,
                    ].map(
                      (score) => (
                        <button
                          key={
                            score
                          }
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            setCriterion(
                              criterion.key,
                              score
                            )
                          }
                          className={
                            `flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold transition ${
                              value ===
                              score
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                            } disabled:opacity-50`
                          }
                          aria-label={`${criterion.label}: ${score} of 5`}
                        >
                          {
                            score
                          }
                        </button>
                      )
                    )}

                    {value > 0 && (
                      <span className="ml-1 flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <Star className="h-3.5 w-3.5" />
                        {value}/5
                      </span>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>


        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Recommendation
            </span>

            <select
              value={
                recommendation
              }
              disabled={
                saving
              }
              onChange={(
                event
              ) =>
                setRecommendation(
                  event
                    .target
                    .value as
                    ApplicantEvaluationRecommendation |
                    ""
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">
                Select recommendation
              </option>

              {RECOMMENDATIONS.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {
                      item.label
                    }
                  </option>
                )
              )}
            </select>
          </label>


          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Strengths
            </span>

            <textarea
              value={
                strengths
              }
              disabled={
                saving
              }
              onChange={(
                event
              ) =>
                setStrengths(
                  event
                    .target
                    .value
                )
              }
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Key strengths..."
            />
          </label>


          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Concerns
            </span>

            <textarea
              value={
                concerns
              }
              disabled={
                saving
              }
              onChange={(
                event
              ) =>
                setConcerns(
                  event
                    .target
                    .value
                )
              }
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Risks, gaps, or concerns..."
            />
          </label>


          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Evaluation Summary
            </span>

            <textarea
              value={
                summary
              }
              disabled={
                saving
              }
              onChange={(
                event
              ) =>
                setSummary(
                  event
                    .target
                    .value
                )
              }
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              placeholder="Overall recruiter assessment..."
            />
          </label>
        </div>


        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              saving ||
              submissions.length ===
                0
            }
            onClick={() =>
              void saveDraft()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />

            {saving
              ? "Saving..."
              : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={
              saving ||
              submissions.length ===
                0
            }
            onClick={() =>
              void submitEvaluation()
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />

            {saving
              ? "Processing..."
              : "Submit Evaluation"}
          </button>
        </div>

        <p className="mt-3 text-[10px] text-slate-400">
          Submitted evaluations are immutable. Recommendation remains a recruiter decision and is not automatically derived from the numeric score.
        </p>
      </section>


      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-slate-500" />

          <h3 className="text-sm font-bold text-slate-900">
            Evaluation History
          </h3>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          Recruiter evaluations are retained independently from immutable Applicant form submissions.
        </p>


        {loading ? (
          <p className="mt-5 text-xs text-slate-400">
            Loading evaluations...
          </p>
        ) : evaluations.length ===
          0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <ClipboardCheck className="mx-auto h-7 w-7 text-slate-300" />

            <p className="mt-2 text-xs font-semibold text-slate-600">
              No recruiter evaluations yet.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {evaluations.map(
              (
                evaluation,
                evaluationIndex
              ) => {
                const linkedIndex =
                  submissions.findIndex(
                    (submission) =>
                      submission._id ===
                      evaluation
                        .submissionId
                  );

                return (
                  <article
                    key={
                      evaluation._id
                    }
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">
                            Evaluation{" "}
                            {
                              evaluations.length -
                              evaluationIndex
                            }
                          </p>

                          <span
                            className={
                              `rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
                                evaluation.status ===
                                "submitted"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`
                            }
                          >
                            {
                              evaluation.status
                            }
                          </span>

                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                            {recommendationLabel(
                              evaluation
                                .recommendation
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] text-slate-400">
                          Evaluator:{" "}
                          {
                            evaluation
                              .evaluator
                              .name ||
                            evaluation
                              .evaluator
                              .userId
                          }
                          {evaluation
                            .evaluator
                            .role
                            ? ` · ${
                                evaluation
                                  .evaluator
                                  .role
                              }`
                            : ""}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {linkedIndex >=
                          0
                            ? submissionLabel(
                                submissions[
                                  linkedIndex
                                ],
                                linkedIndex
                              )
                            : `Submission ${evaluation.submissionId}`}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          Created:{" "}
                          {formatDateTime(
                            evaluation
                              .createdAt
                          )}

                          {evaluation
                            .submittedAt
                            ? ` · Submitted: ${formatDateTime(
                                evaluation
                                  .submittedAt
                              )}`
                            : ""}
                        </p>
                      </div>


                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Rating
                          </p>

                          <p className="text-sm font-bold text-slate-800">
                            {
                              evaluation
                                .averageRating
                            }
                            /5
                          </p>
                        </div>

                        <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-blue-500">
                            Score
                          </p>

                          <p className="text-sm font-bold text-blue-700">
                            {
                              evaluation
                                .weightedScore
                            }
                            /100
                          </p>
                        </div>
                      </div>
                    </div>


                    <div className="mt-4 grid gap-2 sm:grid-cols-5">
                      {CRITERIA.map(
                        (
                          criterion
                        ) => (
                          <div
                            key={
                              criterion.key
                            }
                            className="rounded-lg bg-slate-50 p-2.5"
                          >
                            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              {
                                criterion.label
                              }
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-800">
                              {
                                evaluation
                                  .criteria[
                                  criterion.key
                                ]
                              }
                              /5
                            </p>
                          </div>
                        )
                      )}
                    </div>


                    {(evaluation
                      .strengths ||
                      evaluation
                        .concerns ||
                      evaluation
                        .summary) && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {evaluation
                          .strengths && (
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                              Strengths
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                              {
                                evaluation
                                  .strengths
                              }
                            </p>
                          </div>
                        )}

                        {evaluation
                          .concerns && (
                          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              Concerns
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                              {
                                evaluation
                                  .concerns
                              }
                            </p>
                          </div>
                        )}

                        {evaluation
                          .summary && (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 sm:col-span-2">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              Summary
                            </p>

                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                              {
                                evaluation
                                  .summary
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    )}


                    {evaluation.status ===
                      "draft" && (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            editDraft(
                              evaluation
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit Draft
                        </button>

                        <p className="mt-2 text-[10px] text-slate-400">
                          The server permits draft editing only by the original evaluator.
                        </p>
                      </div>
                    )}


                    {evaluation.status ===
                      "submitted" && (
                      <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Submitted evaluation — immutable
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}
