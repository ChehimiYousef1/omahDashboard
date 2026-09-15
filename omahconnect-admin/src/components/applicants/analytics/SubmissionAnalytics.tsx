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
} from "./AnalyticsShared";


export function SubmissionAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const submissions =
    analytics.management
      .submissions;


  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Total Submissions
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              submissions.total
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Applicants With Submissions
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              submissions
                .applicantsWithSubmissions
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Multiple Submissions
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              submissions
                .applicantsWithMultipleSubmissions
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Avg Submissions / Applicant
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              submissions
                .averageSubmissionsPerApplicant
            }
          </p>
        </article>
      </div>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Submission Sources"
        >
          <BreakdownBarList
            data={
              submissions.sources
            }
          />
        </Panel>


        <Panel
          title="Historical Submission Status"
          subtitle="Immutable ApplicantFormSubmission recruitment status. Kept separate from the current master Applicant pipeline."
        >
          <BreakdownBarList
            data={
              submissions
                .historicalStatuses
            }
          />
        </Panel>
      </div>


      <Panel
        title="Submission Trend"
        subtitle="Monthly Applicant form submission volume."
      >
        {submissions.trend.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={
                  submissions.trend
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
                  stroke="#7c3aed"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>


      <Panel
        title="Historical Submission Status Distribution"
      >
        <div className="h-72">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                submissions
                  .historicalStatuses
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
                fill="#7c3aed"
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
    </div>
  );
}
