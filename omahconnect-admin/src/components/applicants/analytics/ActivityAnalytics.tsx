import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
} from "./AnalyticsShared";


export function ActivityAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const activity =
    analytics.activity;

  const recent =
    analytics.management
      .recentActivity;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Recorded Activities
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {activity.total}
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Status Transitions
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              activity
                .statusFlow
                .recordedTransitions
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            First Recorded
          </p>

          <p className="mt-2 text-xs font-bold text-slate-700">
            {formatDateTime(
              activity
                .statusFlow
                .firstRecordedAt
            )}
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Last Recorded
          </p>

          <p className="mt-2 text-xs font-bold text-slate-700">
            {formatDateTime(
              activity
                .statusFlow
                .lastRecordedAt
            )}
          </p>
        </article>
      </div>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Activity by Category"
          subtitle="Recorded Applicant actions grouped by operational category."
        >
          <BreakdownBarList
            data={
              activity.categories
            }
            limit={20}
          />
        </Panel>


        <Panel
          title="Activity Trend"
          subtitle="Monthly recorded Applicant-management activity."
        >
          {activity.trend.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    activity.trend
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="period"
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>


      <Panel
        title="Activity Category Distribution"
        subtitle="Visual comparison of recorded activity categories."
      >
        <div className="h-72">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                activity.categories
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 9,
                }}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize: 10,
                }}
              />

              <Tooltip />

              <Bar
                dataKey="count"
                fill="#2563eb"
                radius={[
                  5,
                  5,
                  0,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>


      <Panel
        title="Recent Applicant Activity"
        subtitle="Latest audited Applicant-management events."
      >
        {recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {recent.map(
              item => (
                <div
                  key={
                    item.id
                  }
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700">
                      {
                        item.title ||
                        item.type
                      }
                    </p>

                    <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-400">
                      {
                        item.category
                      }
                    </p>

                    {item.description && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        {
                          item.description
                        }
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 text-[9px] text-slate-400">
                    {formatDateTime(
                      item.occurredAt
                    )}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
