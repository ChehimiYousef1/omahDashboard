import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Edit3,
  FolderCog,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  addApplicantToTalentPool,
  archiveApplicantTalentPoolCategory,
  completeApplicantTalentPoolReview,
  createApplicantTalentPoolCategory,
  fetchApplicantDuplicateCases,
  fetchApplicantTalentPoolCategories,
  fetchApplicantTalentPoolMembership,
  fetchApplicantTalentPoolOptions,
  patchApplicantTalentPoolCategory,
  patchApplicantTalentPoolMembership,
  removeApplicantFromTalentPool,
  restoreApplicantTalentPoolCategory,
  restoreApplicantToTalentPool,
  scheduleApplicantTalentPoolReview,
  type ApplicantTalentPoolCategory,
  type ApplicantTalentPoolItem,
  type ApplicantTalentPoolOptions,
  type ApplicantTalentPoolPriority,
} from "../../services/api";


interface ApplicantTalentPoolProfilePanelProps {
  applicantId:
    string;

  applicantName?:
    string;
}


type DuplicateCaseLike =
  Record<
    string,
    unknown
  > & {
    sourceApplicantId?:
      string;

    candidateApplicantId?:
      string;

    status?:
      unknown;
  };


const EMPTY_OPTIONS:
  ApplicantTalentPoolOptions = {
    categories: [],
    roles: [],
    skills: [],
    technicalExperienceLevels: [],
    tags: [],
    priorities: [
      "normal",
      "medium",
      "high",
    ],
    ownerIds: [],
    countries: [],
    cities: [],
    positionTracks: [],
    positionTypes: [],
    recruitmentStatuses: [],
    reviewStatuses: [],
    sortFields: [],
  };


function nestedString(
  value:
    unknown,

  key:
    string
): string {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return "";
  }

  const raw =
    (
      value as
        Record<
          string,
          unknown
        >
    )[key];

  return (
    typeof raw ===
      "string"
      ? raw
      : ""
  );
}


function duplicateDecision(
  duplicate:
    DuplicateCaseLike
): string {
  const direct =
    nestedString(
      duplicate,
      "decision"
    );

  if (direct) {
    return direct.toLowerCase();
  }

  for (
    const container
    of [
      "review",
      "resolution",
      "result",
    ]
  ) {
    const child =
      duplicate[
        container
      ];

    const decision =
      nestedString(
        child,
        "decision"
      );

    if (decision) {
      return decision.toLowerCase();
    }
  }

  return "";
}


function duplicateIsResolved(
  duplicate:
    DuplicateCaseLike
): boolean {
  const status =
    String(
      duplicate.status ??
      ""
    )
      .trim()
      .toLowerCase();

  return [
    "resolved",
    "closed",
    "dismissed",
  ].includes(
    status
  );
}


function duplicateMeansSamePerson(
  duplicate:
    DuplicateCaseLike
): boolean {
  const decision =
    duplicateDecision(
      duplicate
    )
      .replace(
        /[-\s]+/g,
        "_"
      );

  return [
    "same_person",
    "same",
    "duplicate",
    "confirmed_duplicate",
    "same_applicant",
  ].includes(
    decision
  );
}


function extractDuplicateCases(
  response:
    unknown
): DuplicateCaseLike[] {
  if (
    !response ||
    typeof response !==
      "object"
  ) {
    return [];
  }

  const raw =
    response as
      Record<
        string,
        unknown
      >;

  for (
    const key
    of [
      "duplicateCases",
      "cases",
      "items",
      "duplicates",
    ]
  ) {
    const value =
      raw[
        key
      ];

    if (
      Array.isArray(
        value
      )
    ) {
      return value as
        DuplicateCaseLike[];
    }
  }

  return [];
}


function otherApplicantId(
  duplicate:
    DuplicateCaseLike,

  applicantId:
    string
): string {
  const source =
    String(
      duplicate
        .sourceApplicantId ??
      ""
    );

  const candidate =
    String(
      duplicate
        .candidateApplicantId ??
      ""
    );

  if (
    source ===
    applicantId
  ) {
    return candidate;
  }

  if (
    candidate ===
    applicantId
  ) {
    return source;
  }

  return "";
}


function formatDateTime(
  value?:
    string |
    null
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString();
}


function displayLabel(
  value?:
    string |
    null
): string {
  if (!value) {
    return "—";
  }

  return value
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}


function errorMessage(
  error:
    unknown
): string {
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
              message?: string;
              error?: string;
            };
          };
        }
      ).response;

    return (
      response
        ?.data
        ?.message ||
      response
        ?.data
        ?.error ||
      "Talent Pool request failed."
    );
  }

  return (
    error instanceof Error
      ? error.message
      : "Talent Pool request failed."
  );
}


export function ApplicantTalentPoolProfilePanel({
  applicantId,
  applicantName,
}: ApplicantTalentPoolProfilePanelProps) {
  const [
    membership,
    setMembership,
  ] =
    useState<
      ApplicantTalentPoolItem |
      null
    >(
      null
    );

  const [
    options,
    setOptions,
  ] =
    useState<
      ApplicantTalentPoolOptions
    >(
      EMPTY_OPTIONS
    );

  const [
    categories,
    setCategories,
  ] =
    useState<
      ApplicantTalentPoolCategory[]
    >(
      []
    );

  const [
    duplicates,
    setDuplicates,
  ] =
    useState<
      DuplicateCaseLike[]
    >(
      []
    );

  const [
    samePersonPoolConflict,
    setSamePersonPoolConflict,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(
      false
    );

  const [
    categoryManagerOpen,
    setCategoryManagerOpen,
  ] =
    useState(
      false
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    formCategory,
    setFormCategory,
  ] =
    useState("");

  const [
    formRoles,
    setFormRoles,
  ] =
    useState("");

  const [
    formPriority,
    setFormPriority,
  ] =
    useState<
      ApplicantTalentPoolPriority
    >(
      "normal"
    );

  const [
    formOwner,
    setFormOwner,
  ] =
    useState("");

  const [
    formReason,
    setFormReason,
  ] =
    useState("");

  const [
    formNextReviewAt,
    setFormNextReviewAt,
  ] =
    useState("");

  const [
    categoryName,
    setCategoryName,
  ] =
    useState("");

  const [
    categoryDescription,
    setCategoryDescription,
  ] =
    useState("");

  const [
    categorySortOrder,
    setCategorySortOrder,
  ] =
    useState("0");


  const talentPool =
    membership
      ?.talentPool;


  const activeMembership =
    talentPool
      ?.active ===
    true;


  const unresolvedDuplicates =
    useMemo(
      () =>
        duplicates.filter(
          duplicate =>
            !duplicateIsResolved(
              duplicate
            )
        ),
      [
        duplicates,
      ]
    );


  const duplicateAddBlocked =
    unresolvedDuplicates
      .length >
      0 ||
    Boolean(
      samePersonPoolConflict
    );


  const load =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setError("");

        try {
          const [
            nextMembership,
            nextOptions,
            nextCategories,
            duplicateResponse,
          ] =
            await Promise.all([
              fetchApplicantTalentPoolMembership(
                applicantId
              ),

              fetchApplicantTalentPoolOptions(),

              fetchApplicantTalentPoolCategories(),

              fetchApplicantDuplicateCases({
                applicantId,
              }),
            ]);


          const nextDuplicates =
            extractDuplicateCases(
              duplicateResponse
            );


          setMembership(
            nextMembership
          );

          setOptions(
            nextOptions
          );

          setCategories(
            nextCategories
          );

          setDuplicates(
            nextDuplicates
          );


          const samePersonOtherIds =
            [
              ...new Set(
                nextDuplicates
                  .filter(
                    duplicate =>
                      duplicateIsResolved(
                        duplicate
                      ) &&
                      duplicateMeansSamePerson(
                        duplicate
                      )
                  )
                  .map(
                    duplicate =>
                      otherApplicantId(
                        duplicate,
                        applicantId
                      )
                  )
                  .filter(Boolean)
              ),
            ];


          let conflictId =
            "";

          for (
            const otherId
            of samePersonOtherIds
          ) {
            const otherMembership =
              await fetchApplicantTalentPoolMembership(
                otherId
              );

            if (
              otherMembership
                ?.talentPool
                ?.active ===
              true
            ) {
              conflictId =
                otherId;

              break;
            }
          }

          setSamePersonPoolConflict(
            conflictId
          );
        } catch (
          nextError
        ) {
          setError(
            errorMessage(
              nextError
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        applicantId,
      ]
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ]
  );


  function openAddForm() {
    setFormCategory(
      options
        .categories[0]
        ?._id ||
      ""
    );

    setFormRoles(
      ""
    );

    setFormPriority(
      "normal"
    );

    setFormOwner(
      ""
    );

    setFormReason(
      ""
    );

    setFormNextReviewAt(
      ""
    );

    setFormOpen(
      true
    );
  }


  function openEditForm() {
    setFormCategory(
      membership
        ?.category
        ?._id ||
      talentPool
        ?.categoryId ||
      ""
    );

    setFormRoles(
      (
        talentPool
          ?.roles ||
        []
      ).join(
        ", "
      )
    );

    setFormPriority(
      talentPool
        ?.priority ||
      "normal"
    );

    setFormOwner(
      talentPool
        ?.ownerId ||
      ""
    );

    setFormReason(
      talentPool
        ?.reason ||
      ""
    );

    setFormNextReviewAt(
      talentPool
        ?.nextReviewAt
        ? new Date(
            talentPool
              .nextReviewAt
          )
            .toISOString()
            .slice(
              0,
              16
            )
        : ""
    );

    setFormOpen(
      true
    );
  }


  async function saveMembership() {
    const roles =
      formRoles
        .split(",")
        .map(
          role =>
            role.trim()
        )
        .filter(Boolean);

    if (
      !activeMembership &&
      !formCategory
    ) {
      setError(
        "Select a Talent Pool category before adding this Applicant."
      );

      return;
    }

    if (
      !activeMembership &&
      duplicateAddBlocked
    ) {
      setError(
        unresolvedDuplicates
          .length >
          0
          ? "Resolve the pending Duplicate Review before adding this Applicant to the Talent Pool."
          : "Another Applicant resolved as the same person already has an active Talent Pool membership."
      );

      return;
    }

    setSaving(
      true
    );

    setError("");

    try {
      const nextReviewAt =
        formNextReviewAt
          ? new Date(
              formNextReviewAt
            ).toISOString()
          : null;

      if (
        activeMembership
      ) {
        await patchApplicantTalentPoolMembership(
          applicantId,
          {
            categoryId:
              formCategory ||
              null,

            roles,

            priority:
              formPriority,

            ownerId:
              formOwner.trim(),

            reason:
              formReason.trim(),

            nextReviewAt,
          }
        );
      } else {
        await addApplicantToTalentPool(
          applicantId,
          {
            categoryId:
              formCategory,

            roles,

            priority:
              formPriority,

            ownerId:
              formOwner.trim(),

            source:
              "manual",

            reason:
              formReason.trim(),

            nextReviewAt,
          }
        );
      }

      setFormOpen(
        false
      );

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    } finally {
      setSaving(
        false
      );
    }
  }


  async function removeMembership() {
    if (
      !window.confirm(
        `Remove ${applicantName || "this Applicant"} from the Talent Pool?\n\nThe Applicant profile will NOT be deleted.`
      )
    ) {
      return;
    }

    try {
      await removeApplicantFromTalentPool(
        applicantId
      );

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    }
  }


  async function restoreMembership() {
    try {
      await restoreApplicantToTalentPool(
        applicantId
      );

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    }
  }


  async function completeReview() {
    if (
      !window.confirm(
        "Mark this Talent Pool review as completed?"
      )
    ) {
      return;
    }

    try {
      await completeApplicantTalentPoolReview(
        applicantId
      );

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    }
  }


  async function scheduleReview() {
    const current =
      talentPool
        ?.nextReviewAt
        ? new Date(
            talentPool
              .nextReviewAt
          )
            .toISOString()
            .slice(
              0,
              16
            )
        : "";

    const value =
      window.prompt(
        "Next Talent Pool review date/time (YYYY-MM-DDTHH:mm):",
        current
      );

    if (!value) {
      return;
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      window.alert(
        "Invalid review date/time."
      );

      return;
    }

    try {
      await scheduleApplicantTalentPoolReview(
        applicantId,
        date.toISOString()
      );

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    }
  }


  function openDuplicateReview() {
    window.dispatchEvent(
      new CustomEvent(
        "omah:open-duplicate-review",
        {
          detail: {
            applicantId,
          },
        }
      )
    );
  }


  async function createCategory() {
    const name =
      categoryName.trim();

    if (!name) {
      setError(
        "Category name is required."
      );

      return;
    }

    const sortOrder =
      Number(
        categorySortOrder ||
        0
      );

    try {
      await createApplicantTalentPoolCategory({
        name,

        description:
          categoryDescription.trim(),

        sortOrder:
          Number.isFinite(
            sortOrder
          )
            ? sortOrder
            : 0,
      });

      setCategoryName(
        ""
      );

      setCategoryDescription(
        ""
      );

      setCategorySortOrder(
        "0"
      );

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    }
  }


  async function editCategory(
    category:
      ApplicantTalentPoolCategory
  ) {
    const name =
      window.prompt(
        "Category name:",
        category.name
      );

    if (
      name ===
      null
    ) {
      return;
    }

    const description =
      window.prompt(
        "Category description:",
        category.description ||
        ""
      );

    if (
      description ===
      null
    ) {
      return;
    }

    try {
      await patchApplicantTalentPoolCategory(
        category._id,
        {
          name:
            name.trim(),

          description:
            description.trim(),

          sortOrder:
            category.sortOrder ??
            0,
        }
      );

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    }
  }


  async function toggleCategory(
    category:
      ApplicantTalentPoolCategory
  ) {
    try {
      if (
        category.active ===
        false
      ) {
        await restoreApplicantTalentPoolCategory(
          category._id
        );
      } else {
        if (
          !window.confirm(
            `Archive Talent Pool category "${category.name}"?`
          )
        ) {
          return;
        }

        await archiveApplicantTalentPoolCategory(
          category._id
        );
      }

      await load();
    } catch (
      nextError
    ) {
      setError(
        errorMessage(
          nextError
        )
      );
    }
  }


  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading Talent Pool membership...
      </div>
    );
  }


  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Retained Talent
            </div>

            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Talent Pool Membership
            </h3>

            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Keep this Applicant available for future opportunities without creating a second candidate record.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void load()
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                setCategoryManagerOpen(
                  true
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <FolderCog className="h-4 w-4" />
              Manage Categories
            </button>
          </div>
        </div>
      </section>


      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}


      {unresolvedDuplicates.length >
        0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div className="flex-1">
              <h4 className="font-bold text-amber-900">
                Duplicate Review Pending
              </h4>

              <p className="mt-1 text-sm text-amber-800">
                This Applicant has {unresolvedDuplicates.length} unresolved duplicate case{unresolvedDuplicates.length === 1 ? "" : "s"}. A new Talent Pool membership is blocked until identity review is completed.
              </p>

              <button
                type="button"
                onClick={
                  openDuplicateReview
                }
                className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800"
              >
                Open Duplicate Review
              </button>
            </div>
          </div>
        </section>
      )}


      {samePersonPoolConflict && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />

            <div>
              <h4 className="font-bold text-rose-900">
                Same Person Already Retained
              </h4>

              <p className="mt-1 text-sm text-rose-800">
                A Duplicate Review resolved another Applicant as the same person, and that record already has an active Talent Pool membership. This prevents accidental double-retention.
              </p>

              <p className="mt-2 text-xs font-mono text-rose-700">
                Other Applicant: {samePersonPoolConflict}
              </p>
            </div>
          </div>
        </section>
      )}


      {!membership ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Users className="mx-auto h-9 w-9 text-slate-300" />

          <h4 className="mt-3 font-bold text-slate-800">
            Not in Talent Pool
          </h4>

          <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500">
            Add this Applicant when their profile should be retained and revisited for future opportunities.
          </p>

          <button
            type="button"
            disabled={
              duplicateAddBlocked
            }
            onClick={
              openAddForm
            }
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserPlus className="h-4 w-4" />
            Add to Talent Pool
          </button>
        </section>
      ) : activeMembership ? (
        <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Active Talent Pool Member
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Info
                  label="Category"
                  value={
                    membership
                      .category
                      ?.name ||
                    "Uncategorized"
                  }
                />

                <Info
                  label="Priority"
                  value={
                    displayLabel(
                      talentPool
                        ?.priority
                    )
                  }
                />

                <Info
                  label="Owner"
                  value={
                    talentPool
                      ?.ownerId ||
                    "Unassigned"
                  }
                />

                <Info
                  label="Roles"
                  value={
                    talentPool
                      ?.roles
                      ?.join(", ") ||
                    "—"
                  }
                />

                <Info
                  label="Last Review"
                  value={
                    formatDateTime(
                      talentPool
                        ?.lastReviewedAt
                    )
                  }
                />

                <Info
                  label="Next Review"
                  value={
                    formatDateTime(
                      talentPool
                        ?.nextReviewAt
                    )
                  }
                />
              </div>

              {talentPool
                ?.reason && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Retention Reason
                  </div>

                  <div className="mt-1 text-sm text-slate-700">
                    {talentPool.reason}
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-w-[220px] flex-wrap gap-2 xl:max-w-[310px]">
              <button
                type="button"
                onClick={
                  openEditForm
                }
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
              >
                <Edit3 className="h-4 w-4" />
                Edit Membership
              </button>

              <button
                type="button"
                onClick={() =>
                  void completeReview()
                }
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Review
              </button>

              <button
                type="button"
                onClick={() =>
                  void scheduleReview()
                }
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
              >
                <CalendarClock className="h-4 w-4" />
                Schedule Review
              </button>

              <button
                type="button"
                onClick={() =>
                  void removeMembership()
                }
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold text-slate-800">
                Talent Pool Membership Removed
              </div>

              <p className="mt-1 text-sm text-slate-500">
                The Applicant profile still exists. Restore only the Talent Pool membership when appropriate.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void restoreMembership()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Restore Membership
            </button>
          </div>
        </section>
      )}


      {formOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="font-bold text-slate-900">
                  {activeMembership
                    ? "Edit Talent Pool Membership"
                    : "Add to Talent Pool"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Applicant identity, profile, skills and history remain stored only in the Applicant master record.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFormOpen(
                    false
                  )
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Category *
                </span>

                <select
                  value={
                    formCategory
                  }
                  onChange={
                    event =>
                      setFormCategory(
                        event
                          .target
                          .value
                      )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">
                    Select Category
                  </option>

                  {options.categories.map(
                    category => (
                      <option
                        key={
                          category._id
                        }
                        value={
                          category._id
                        }
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>
              </label>


              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Priority
                </span>

                <select
                  value={
                    formPriority
                  }
                  onChange={
                    event =>
                      setFormPriority(
                        event
                          .target
                          .value as
                          ApplicantTalentPoolPriority
                      )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="normal">
                    Normal
                  </option>
                  <option value="medium">
                    Medium
                  </option>
                  <option value="high">
                    High
                  </option>
                </select>
              </label>


              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Roles
                </span>

                <input
                  value={
                    formRoles
                  }
                  onChange={
                    event =>
                      setFormRoles(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Backend Developer, .NET Developer"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />

                <span className="mt-1 block text-[10px] text-slate-400">
                  Separate multiple roles with commas.
                </span>
              </label>


              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Owner
                </span>

                <input
                  value={
                    formOwner
                  }
                  onChange={
                    event =>
                      setFormOwner(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Recruiter / owner"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>


              <label>
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Next Review
                </span>

                <input
                  type="datetime-local"
                  value={
                    formNextReviewAt
                  }
                  onChange={
                    event =>
                      setFormNextReviewAt(
                        event
                          .target
                          .value
                      )
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>


              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Retention Reason
                </span>

                <textarea
                  rows={
                    4
                  }
                  value={
                    formReason
                  }
                  onChange={
                    event =>
                      setFormReason(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Why should this Applicant be retained for future opportunities?"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-between gap-2 border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(
                    false
                  );

                  setCategoryManagerOpen(
                    true
                  );
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
              >
                Manage Categories
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormOpen(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void saveMembership()
                  }
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : activeMembership
                      ? "Save Changes"
                      : "Add to Talent Pool"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {categoryManagerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white p-5">
              <div>
                <h3 className="font-bold text-slate-900">
                  Talent Pool Categories
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Create, edit, archive and restore reusable Talent Pool categories.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCategoryManagerOpen(
                    false
                  )
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>


            <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[1fr_1.4fr_100px_auto]">
              <input
                value={
                  categoryName
                }
                onChange={
                  event =>
                    setCategoryName(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Category name"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />

              <input
                value={
                  categoryDescription
                }
                onChange={
                  event =>
                    setCategoryDescription(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Description"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />

              <input
                type="number"
                value={
                  categorySortOrder
                }
                onChange={
                  event =>
                    setCategorySortOrder(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Order"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />

              <button
                type="button"
                onClick={() =>
                  void createCategory()
                }
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
              >
                Create
              </button>
            </div>


            <div className="divide-y divide-slate-100">
              {categories.length ===
              0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No Talent Pool categories are available.
                </div>
              ) : (
                categories.map(
                  category => (
                    <div
                      key={
                        category._id
                      }
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {category.name}
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              category.active ===
                              false
                                ? "bg-slate-100 text-slate-500"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {category.active ===
                            false
                              ? "Archived"
                              : "Active"}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {category.description ||
                            "No description"}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-400">
                          Sort order: {category.sortOrder ?? 0}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={
                            category.active ===
                            false
                          }
                          onClick={() =>
                            void editCategory(
                              category
                            )
                          }
                          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-40"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void toggleCategory(
                              category
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                            category.active ===
                            false
                              ? "border-emerald-200 text-emerald-700"
                              : "border-rose-200 text-rose-700"
                          }`}
                        >
                          {category.active ===
                          false
                            ? "Restore"
                            : "Archive"}
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Info({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}
