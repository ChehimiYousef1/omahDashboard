import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";

import {
  Panel,
  formatPercent,
} from "./AnalyticsShared";


export function DataQualityAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const quality =
    analytics.management
      .dataQuality;


  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Profile Field Coverage
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatPercent(
              quality
                .profileFieldCoveragePercent
            )}
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Complete Profiles
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              quality
                .completeProfiles
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Incomplete Profiles
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {
              quality
                .incompleteProfiles
            }
          </p>
        </article>

        <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            CV Coverage
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatPercent(
              quality
                .cvCoverage
                .coveragePercent
            )}
          </p>
        </article>
      </div>


      <Panel
        title="Profile Field Coverage"
        subtitle="Coverage of the explicitly defined Applicant data-quality fields."
      >
        <div className="h-[380px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={
                quality.fields
              }
              layout="vertical"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
              />

              <XAxis
                type="number"
                domain={[
                  0,
                  100,
                ]}
                tick={{
                  fontSize: 10,
                }}
              />

              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{
                  fontSize: 10,
                }}
              />

              <Tooltip />

              <Bar
                dataKey="coveragePercent"
                name="Coverage %"
                fill="#2563eb"
                radius={[
                  0,
                  5,
                  5,
                  0,
                ]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>


      <Panel
        title="Missing Applicant Data"
        subtitle="Number of Applicants missing each field used in the dashboard completeness definition."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-2 pr-4">
                  Field
                </th>

                <th className="pb-2 pr-4">
                  Present
                </th>

                <th className="pb-2 pr-4">
                  Missing
                </th>

                <th className="pb-2">
                  Coverage
                </th>
              </tr>
            </thead>

            <tbody>
              {quality.fields.map(
                field => (
                  <tr
                    key={
                      field.key
                    }
                    className="border-b border-slate-50"
                  >
                    <td className="py-3 pr-4 font-semibold text-slate-700">
                      {
                        field.label
                      }
                    </td>

                    <td className="py-3 pr-4 text-slate-500">
                      {
                        field.present
                      }
                    </td>

                    <td className="py-3 pr-4 text-slate-500">
                      {
                        field.missing
                      }
                    </td>

                    <td className="py-3 font-semibold text-slate-700">
                      {
                        field.coveragePercent
                      }%
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Panel>


      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[10px] leading-4 text-blue-700">
        Profile completeness is calculated transparently from Email, Phone, Country, City, Position Track, University, Degree Level, and Technical Skills. It is not an existing hidden Applicant score.
      </div>
    </div>
  );
}
