import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";

import {
  EmptyState,
  Panel,
  formatMetric,
  formatPercent,
} from "./AnalyticsShared";


export function EvaluationAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const data =
    analytics.evaluations;


  const metrics = [
    [
      "Submitted",
      data.submitted,
    ],

    [
      "Draft",
      data.draft,
    ],

    [
      "Average Rating",
      formatMetric(
        data.averageRating,
        " / 5"
      ),
    ],

    [
      "Average Score",
      formatMetric(
        data.averageWeightedScore,
        " / 100"
      ),
    ],

    [
      "Positive Recommendation",
      formatPercent(
        data.positiveRecommendationRate
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


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Recommendation Distribution"
          subtitle="Submitted evaluation recommendation outcomes."
        >
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  data.recommendations
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={
                    false
                  }
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 9,
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


        <Panel
          title="Evaluation Criteria Radar"
          subtitle="Mean submitted score across the five weighted evaluation criteria."
        >
          {data.criteriaAverages
            .every(
              item =>
                item.average ===
                null
            ) ? (
            <EmptyState />
          ) : (
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <RadarChart
                  data={
                    data.criteriaAverages
                  }
                >
                  <PolarGrid />

                  <PolarAngleAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9,
                    }}
                  />

                  <PolarRadiusAxis
                    domain={[
                      0,
                      5,
                    ]}
                    tick={{
                      fontSize: 9,
                    }}
                  />

                  <Radar
                    dataKey="average"
                    name="Average"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={
                      0.25
                    }
                  />

                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Rating Histogram"
          subtitle="Distribution of submitted average evaluation ratings."
        >
          <div className="h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  data.ratingHistogram
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={
                    false
                  }
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 9,
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
                  dataKey="count"
                  fill="#0891b2"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>


        <Panel
          title="Weighted Score Histogram"
          subtitle="Distribution of submitted weighted evaluation scores."
        >
          <div className="h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  data.scoreHistogram
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={
                    false
                  }
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 9,
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
                  dataKey="count"
                  fill="#0f766e"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>


      <Panel
        title="Submitted Evaluations Over Time"
        subtitle="Monthly submitted evaluation volume."
      >
        {data.trend.length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
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

                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#7c3aed"
                  strokeWidth={
                    2
                  }
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>


      <Panel
        title="Recent Recruiter Feedback"
        subtitle="Latest submitted strengths, concerns, summaries, ratings, and recommendations."
      >
        {analytics.management
          .feedback
          .recent
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
                    Recommendation
                  </th>

                  <th className="pb-2 pr-4">
                    Rating
                  </th>

                  <th className="pb-2 pr-4">
                    Score
                  </th>

                  <th className="pb-2">
                    Feedback
                  </th>
                </tr>
              </thead>

              <tbody>
                {analytics.management
                  .feedback
                  .recent
                  .map(
                    feedback => (
                      <tr
                        key={
                          feedback.id
                        }
                        className="border-b border-slate-50"
                      >
                        <td className="py-3 pr-4 font-semibold text-slate-700">
                          {
                            feedback.applicantName
                          }
                        </td>

                        <td className="py-3 pr-4 capitalize text-slate-500">
                          {
                            feedback.recommendation.replace(
                              /_/g,
                              " "
                            )
                          }
                        </td>

                        <td className="py-3 pr-4 text-slate-500">
                          {
                            feedback.averageRating ??
                            "—"
                          }
                        </td>

                        <td className="py-3 pr-4 text-slate-500">
                          {
                            feedback.weightedScore ??
                            "—"
                          }
                        </td>

                        <td className="max-w-[360px] py-3 text-slate-500">
                          <span className="line-clamp-2">
                            {
                              feedback.summary ||
                              feedback.strengths ||
                              feedback.concerns ||
                              "—"
                            }
                          </span>
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
