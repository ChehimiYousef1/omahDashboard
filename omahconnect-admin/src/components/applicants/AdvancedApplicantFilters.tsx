import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type {
  ApplicantLifecycleFilter,
  ApplicantPipelineDefinition,
  ApplicantSearchOptions,
  ApplicantSearchQuery,
  ApplicantSortField,
  ApplicantSortOrder,
  ApplicantStatus,
} from "../../services/api";

interface AdvancedApplicantFiltersProps {
  filters: ApplicantSearchQuery;
  options: ApplicantSearchOptions | null;
  pipeline: ApplicantPipelineDefinition | null;
  loading?: boolean;
  onChange: (
    next: ApplicantSearchQuery
  ) => void;
  onReset: () => void;
}

const SORT_LABELS:
  Record<ApplicantSortField, string> = {
    lastActivityAt: "Last Activity",
    firstAppliedAt: "First Applied",
    lastAppliedAt: "Last Applied",
    fullName: "Full Name",
    status: "Status",
    createdAt: "Created",
    updatedAt: "Updated",
  };

function textValue(
  value: unknown
) {
  return typeof value === "string"
    ? value
    : "";
}

function booleanFilterValue(
  value: boolean | undefined
) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "";
}

export function AdvancedApplicantFilters({
  filters,
  options,
  pipeline,
  loading = false,
  onChange,
  onReset,
}: AdvancedApplicantFiltersProps) {
  function update<K extends keyof ApplicantSearchQuery>(
    key: K,
    value: ApplicantSearchQuery[K]
  ) {
    onChange({
      ...filters,
      [key]: value,
      page: 1,
    });
  }

  function updateOptionalText<
    K extends keyof ApplicantSearchQuery
  >(
    key: K,
    value: string
  ) {
    update(
      key,
      (
        value.trim()
          ? value
          : undefined
      ) as ApplicantSearchQuery[K]
    );
  }

  const activeFilterCount =
    [
      filters.status,
      filters.positionTrack,
      filters.positionType,
      filters.country,
      filters.city,
      filters.source,
      filters.assignedRecruiterId,
      filters.skill,
      filters.tag,
      filters.hasLinkedIn !==
        undefined
        ? "linkedin"
        : undefined,
      filters.hasGitHub !==
        undefined
        ? "github"
        : undefined,
      filters.appliedFrom,
      filters.appliedTo,
    ].filter(Boolean).length;

  return (
    <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={textValue(filters.q)}
              disabled={loading}
              placeholder="Search name, email, phone, university, position, skills, profiles, tags..."
              onChange={(event) =>
                updateOptionalText(
                  "q",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={
                filters.status || ""
              }
              disabled={loading}
              onChange={(event) =>
                update(
                  "status",
                  (
                    event.target.value ||
                    undefined
                  ) as
                    | ApplicantStatus
                    | undefined
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs disabled:bg-slate-50"
            >
              <option value="">
                All Stages
              </option>

              {(options?.statuses || []).map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {
                      pipeline
                        ?.stages.find(
                          (
                            stage
                          ) =>
                            stage.value ===
                            status
                        )
                        ?.label ||
                      status
                    }
                  </option>
                )
              )}
            </select>

            <select
              value={
                filters.archived ||
                "false"
              }
              disabled={loading}
              onChange={(event) =>
                update(
                  "archived",
                  event.target
                    .value as
                    ApplicantLifecycleFilter
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs disabled:bg-slate-50"
            >
              <option value="false">
                Active
              </option>
              <option value="true">
                Archived
              </option>
              <option value="all">
                All Applicants
              </option>
            </select>

            <button
              type="button"
              disabled={loading}
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        <details className="group rounded-lg border border-slate-100">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />

              Advanced Filters

              {activeFilterCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {activeFilterCount}
                </span>
              )}
            </span>

            <span className="text-[10px] font-normal text-slate-400">
              Position · Location · Skills · Profiles · Dates
            </span>
          </summary>

          <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Position Track
              </span>

              <select
                value={
                  filters.positionTrack ||
                  ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "positionTrack",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  All Tracks
                </option>

                {(options?.tracks || []).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Position Type
              </span>

              <select
                value={
                  filters.positionType ||
                  ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "positionType",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  All Types
                </option>

                {(options?.positionTypes || []).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Country
              </span>

              <select
                value={
                  filters.country || ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "country",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  All Countries
                </option>

                {(options?.countries || []).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                City
              </span>

              <select
                value={
                  filters.city || ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "city",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  All Cities
                </option>

                {(options?.cities || []).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Source
              </span>

              <select
                value={
                  filters.source || ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "source",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  All Sources
                </option>

                {(options?.sources || []).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Skill
              </span>

              <input
                type="text"
                value={
                  filters.skill || ""
                }
                disabled={loading}
                placeholder="e.g. Node.js"
                onChange={(event) =>
                  updateOptionalText(
                    "skill",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Tag
              </span>

              <select
                value={
                  filters.tag || ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "tag",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  All Tags
                </option>

                {(options?.tags || []).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Recruiter ID
              </span>

              <input
                type="text"
                value={
                  filters.assignedRecruiterId ||
                  ""
                }
                disabled={loading}
                placeholder="Assigned recruiter"
                onChange={(event) =>
                  updateOptionalText(
                    "assignedRecruiterId",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                LinkedIn
              </span>

              <select
                value={booleanFilterValue(
                  filters.hasLinkedIn
                )}
                disabled={loading}
                onChange={(event) =>
                  update(
                    "hasLinkedIn",
                    event.target.value === ""
                      ? undefined
                      : event.target.value ===
                          "true"
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  Any
                </option>
                <option value="true">
                  Has LinkedIn
                </option>
                <option value="false">
                  No LinkedIn
                </option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                GitHub
              </span>

              <select
                value={booleanFilterValue(
                  filters.hasGitHub
                )}
                disabled={loading}
                onChange={(event) =>
                  update(
                    "hasGitHub",
                    event.target.value === ""
                      ? undefined
                      : event.target.value ===
                          "true"
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="">
                  Any
                </option>
                <option value="true">
                  Has GitHub
                </option>
                <option value="false">
                  No GitHub
                </option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Applied From
              </span>

              <input
                type="date"
                value={
                  filters.appliedFrom ||
                  ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "appliedFrom",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Applied To
              </span>

              <input
                type="date"
                value={
                  filters.appliedTo ||
                  ""
                }
                disabled={loading}
                onChange={(event) =>
                  updateOptionalText(
                    "appliedTo",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Sort By
              </span>

              <select
                value={
                  filters.sortBy ||
                  "lastActivityAt"
                }
                disabled={loading}
                onChange={(event) =>
                  update(
                    "sortBy",
                    event.target
                      .value as
                      ApplicantSortField
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                {(
                  options?.sortFields ||
                  [
                    "lastActivityAt",
                    "firstAppliedAt",
                    "lastAppliedAt",
                    "fullName",
                    "status",
                    "createdAt",
                    "updatedAt",
                  ]
                ).map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {SORT_LABELS[value]}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Sort Order
              </span>

              <select
                value={
                  filters.sortOrder ||
                  "desc"
                }
                disabled={loading}
                onChange={(event) =>
                  update(
                    "sortOrder",
                    event.target
                      .value as
                      ApplicantSortOrder
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value="desc">
                  Descending
                </option>
                <option value="asc">
                  Ascending
                </option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Per Page
              </span>

              <select
                value={
                  filters.limit || 25
                }
                disabled={loading}
                onChange={(event) =>
                  update(
                    "limit",
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs disabled:bg-slate-50"
              >
                <option value={10}>
                  10
                </option>
                <option value={25}>
                  25
                </option>
                <option value={50}>
                  50
                </option>
                <option value={100}>
                  100
                </option>
              </select>
            </label>
          </div>
        </details>
      </div>
    </section>
  );
}
