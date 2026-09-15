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
  ApplicantSearchQuery,
} from "../../../services/api";

import {
  ApplicantDocumentManagementCenter,
} from "./ApplicantDocumentManagementCenter";

import {
  BreakdownBarList,
  EmptyState,
  Panel,
  formatPercent,
} from "./AnalyticsShared";


export function DocumentAnalytics({
  analytics,
  filters,
  onOpenApplicant,
  onDocumentsChanged,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;

  filters:
    ApplicantSearchQuery;

  onOpenApplicant?: (
    applicantId: string
  ) =>
    void |
    Promise<void>;

  onDocumentsChanged?: () =>
    void |
    Promise<void>;
}) {
  const documents =
    analytics.management
      .documents;


  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Document Versions
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              documents.totalVersions
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Current Active
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              documents.currentActive
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Archived
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              documents.archived
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Applicants With CV
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              documents.applicantsWithCv
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            CV Coverage
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatPercent(
              documents
                .cvCoveragePercent
            )}
          </p>
        </article>
      </div>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Document Types"
          subtitle="Current active Applicant documents by type."
        >
          <BreakdownBarList
            data={
              documents.types
            }
            limit={20}
          />
        </Panel>


        <Panel
          title="Document Sources"
          subtitle="Where current Applicant documents originated."
        >
          <BreakdownBarList
            data={
              documents.sources
            }
          />
        </Panel>
      </div>


      <Panel
        title="Document Upload Trend"
        subtitle="Monthly active Applicant document upload volume."
      >
        {documents.trend.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={
                  documents.trend
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
                  stroke="#0f766e"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>


      <ApplicantDocumentManagementCenter
        filters={
          filters
        }

        onOpenApplicant={
          onOpenApplicant
        }

        onDocumentsChanged={
          onDocumentsChanged
        }
      />


      <Panel
        title="Document Type Distribution"
      >
        <div className="h-72">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                documents.types
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
    </div>
  );
}
