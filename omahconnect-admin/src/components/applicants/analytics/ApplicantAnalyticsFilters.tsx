import {
  Filter,
} from "lucide-react";

import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";


export function ApplicantAnalyticsFilters({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const filters =
    analytics.filters;

  const entries = [
    [
      "Search",
      filters.q,
    ],

    [
      "From",
      filters.from
        ?.slice(
          0,
          10
        ),
    ],

    [
      "To",
      filters.to
        ?.slice(
          0,
          10
        ),
    ],

    [
      "Stage",
      filters.status,
    ],

    [
      "Track",
      filters.positionTrack,
    ],

    [
      "Position Type",
      filters.positionType,
    ],

    [
      "Country",
      filters.country,
    ],

    [
      "City",
      filters.city,
    ],

    [
      "Source",
      filters.source,
    ],

    [
      "Skill",
      filters.skill,
    ],

    [
      "Tag",
      filters.tag,
    ],
  ].filter(
    entry =>
      Boolean(
        entry[1]
      )
  );


  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="mr-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <Filter className="h-3.5 w-3.5" />
        Analytics Cohort
      </div>

      {entries.length === 0 ? (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
          All active Applicants
        </span>
      ) : (
        entries.map(
          ([
            label,
            value,
          ]) => (
            <span
              key={label}
              className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] text-blue-700"
            >
              <strong>
                {label}:
              </strong>{" "}
              {value}
            </span>
          )
        )
      )}

      {filters.archived !==
        "false" && (
        <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] text-amber-700">
          Lifecycle:{" "}
          {
            filters.archived
          }
        </span>
      )}
    </div>
  );
}
