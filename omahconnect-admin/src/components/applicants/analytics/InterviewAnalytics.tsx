import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";

import {
  BreakdownBarList,
  EmptyState,
  Panel,
  formatDateTime,
  formatPercent,
} from "./AnalyticsShared";


const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
];


export function InterviewAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const data =
    analytics.interviews;

  const outcomeData =
    data.outcomes.filter(
      item =>
        item.count >
        0
    );


  const metrics = [
    [
      "Total Interviews",
      data.total,
    ],

    [
      "Completed",
      data.completed,
    ],

    [
      "Completion Rate",
      formatPercent(
        data.completionRate
      ),
    ],

    [
      "No-Show Rate",
      formatPercent(
        data.noShowRate
      ),
    ],

    [
      "Recommended Rate",
      formatPercent(
        data.recommendedOutcomeRate
      ),
    ],
  ];


  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(
          ([
            label,
            value,
          ]) => (
            <article
              key={
                label
              }
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                {label}
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {value}
              </p>
            </article>
          )
        )}
      </div>


      <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
        <Panel
          title="Interview Status"
        >
          <BreakdownBarList
            data={
              data.statuses
            }
          />
        </Panel>

        <Panel
          title="Interview Outcomes"
        >
          {outcomeData.length ===
          0 ? (
            <EmptyState />
          ) : (
            <div className="h-64">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={
                      outcomeData
                    }
                    dataKey="count"
                    nameKey="label"
                    innerRadius={
                      55
                    }
                    outerRadius={
                      85
                    }
                  >
                    {outcomeData.map(
                      (
                        item,
                        index
                      ) => (
                        <Cell
                          key={
                            item.key
                          }
                          fill={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Interview Types"
        >
          <BreakdownBarList
            data={
              data.types
            }
          />
        </Panel>

        <Panel
          title="Interview Formats"
        >
          <BreakdownBarList
            data={
              data.formats
            }
          />
        </Panel>
      </div>


      <Panel
        title="Interview Activity Over Time"
        subtitle="Monthly scheduled Interview records broken down by current interview lifecycle status."
      >
        {data.trend.length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  data.trend
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={
                    false
                  }
                />

                <XAxis
                  dataKey="period"
                  tick={{
                    fontSize: 10,
                  }}
                />

                <YAxis
                  allowDecimals={
                    false
                  }
                  tick={{
                    fontSize: 10,
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="scheduled"
                  stackId="status"
                  fill="#2563eb"
                  name="Scheduled"
                />

                <Bar
                  dataKey="completed"
                  stackId="status"
                  fill="#16a34a"
                  name="Completed"
                />

                <Bar
                  dataKey="cancelled"
                  stackId="status"
                  fill="#f59e0b"
                  name="Cancelled"
                />

                <Bar
                  dataKey="no_show"
                  stackId="status"
                  fill="#dc2626"
                  name="No Show"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>


      <Panel
        title="Upcoming Interview Schedule"
        subtitle="Scheduled interviews within the current seven-day Action Center window."
      >
        {analytics.management
          .upcomingInterviews
          .length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-2 pr-4">
                    Applicant
                  </th>

                  <th className="pb-2 pr-4">
                    Type
                  </th>

                  <th className="pb-2 pr-4">
                    Format
                  </th>

                  <th className="pb-2 pr-4">
                    Outcome
                  </th>

                  <th className="pb-2">
                    Scheduled
                  </th>
                </tr>
              </thead>

              <tbody>
                {analytics.management
                  .upcomingInterviews
                  .map(
                    interview => (
                      <tr
                        key={
                          interview.id
                        }
                        className="border-b border-slate-50"
                      >
                        <td className="py-3 pr-4 font-semibold text-slate-700">
                          {
                            interview.applicantName
                          }
                        </td>

                        <td className="py-3 pr-4 capitalize text-slate-500">
                          {
                            interview.type
                          }
                        </td>

                        <td className="py-3 pr-4 capitalize text-slate-500">
                          {
                            interview.format
                          }
                        </td>

                        <td className="py-3 pr-4 capitalize text-slate-500">
                          {
                            interview.outcome.replace(
                              /_/g,
                              " "
                            )
                          }
                        </td>

                        <td className="py-3 text-slate-500">
                          {formatDateTime(
                            interview.scheduledStart
                          )}
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
