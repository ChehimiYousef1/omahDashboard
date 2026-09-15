import type {
  ReactNode,
} from "react";

import {
  Inbox,
} from "lucide-react";

import type {
  ApplicantAnalyticsBreakdown,
  ApplicantAnalyticsMatrixRow,
  ApplicantAnalyticsPipelineStage,
} from "../../../services/api";


export function formatMetric(
  value:
    number |
    null |
    undefined,
  suffix = ""
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${value}${suffix}`;
}


export function formatPercent(
  value:
    number |
    null |
    undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${value}%`;
}


export function formatDateTime(
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
    return "—";
  }

  return date.toLocaleString();
}


export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={
        `rounded-xl border border-slate-100 bg-white p-5 shadow-sm ${className}`
      }
    >
      <div className="mb-5">
        <h4 className="text-sm font-bold text-slate-900">
          {title}
        </h4>

        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </article>
  );
}


export function EmptyState({
  text = "No data available for the current Applicant cohort.",
}: {
  text?: string;
}) {
  return (
    <div className="flex min-h-[150px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
      <div>
        <Inbox className="mx-auto h-5 w-5 text-slate-300" />

        <p className="mt-2 text-xs text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}


export function BreakdownBarList({
  data,
  limit = 10,
}: {
  data:
    ApplicantAnalyticsBreakdown[];
  limit?: number;
}) {
  const visible =
    data
      .filter(
        item =>
          item.count >
          0
      )
      .slice(
        0,
        limit
      );

  if (
    visible.length ===
    0
  ) {
    return <EmptyState />;
  }

  const max =
    Math.max(
      1,
      ...visible.map(
        item =>
          item.count
      )
    );

  return (
    <div className="space-y-3">
      {visible.map(
        item => (
          <div
            key={
              item.key
            }
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate font-medium text-slate-600">
                {
                  item.label
                }
              </span>

              <span className="shrink-0 font-bold text-slate-800">
                {
                  item.count
                }

                {item.percent !== undefined && (
                  <span className="ml-1 font-normal text-slate-400">
                    ({item.percent}%)
                  </span>
                )}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{
                  width:
                    `${Math.max(
                      2,
                      (
                        item.count /
                        max
                      ) *
                        100
                    )}%`,
                }}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}


export function MatrixTable({
  rows,
  stages,
}: {
  rows:
    ApplicantAnalyticsMatrixRow[];

  stages:
    ApplicantAnalyticsPipelineStage[];
}) {
  if (
    rows.length ===
    0
  ) {
    return <EmptyState />;
  }

  const max =
    Math.max(
      1,
      ...rows.flatMap(
        row =>
          stages.map(
            stage =>
              Number(
                row.values[
                  stage.status
                ] ||
                0
              )
          )
      )
    );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-1 text-[10px]">
        <thead>
          <tr>
            <th className="min-w-[140px] p-2 text-left font-bold text-slate-500">
              Segment
            </th>

            {stages.map(
              stage => (
                <th
                  key={
                    stage.status
                  }
                  className="min-w-[72px] p-2 text-center font-semibold text-slate-500"
                >
                  {
                    stage.label
                  }
                </th>
              )
            )}

            <th className="p-2 text-center font-bold text-slate-500">
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            row => (
              <tr
                key={
                  row.key
                }
              >
                <td className="rounded-md bg-slate-50 p-2 font-semibold text-slate-700">
                  {
                    row.label
                  }
                </td>

                {stages.map(
                  stage => {
                    const count =
                      Number(
                        row.values[
                          stage.status
                        ] ||
                        0
                      );

                    const intensity =
                      count /
                      max;

                    return (
                      <td
                        key={
                          stage.status
                        }
                        className="rounded-md p-2 text-center font-bold"
                        style={{
                          backgroundColor:
                            count === 0
                              ? "rgb(248 250 252)"
                              : `rgba(37, 99, 235, ${
                                  0.12 +
                                  intensity *
                                    0.7
                                })`,

                          color:
                            intensity >
                            0.45
                              ? "white"
                              : "rgb(51 65 85)",
                        }}
                      >
                        {count}
                      </td>
                    );
                  }
                )}

                <td className="rounded-md bg-slate-100 p-2 text-center font-bold text-slate-800">
                  {
                    row.total
                  }
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
