import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  CopyCheck,
  FileWarning,
  Gift,
} from "lucide-react";

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
  ApplicantAnalyticsDrilldownType,
} from "../../../services/api";

import {
  AnalyticsKpiCards,
} from "./AnalyticsKpiCards";

import {
  EmptyState,
  Panel,
  formatDateTime,
} from "./AnalyticsShared";


type OverviewNavigationTab =
  | "evaluations"
  | "interviews"
  | "dataQuality";


interface AnalyticsOverviewProps {
  analytics:
    ApplicantRecruitmentAnalytics;

  onNavigateTab?: (
    tab:
      OverviewNavigationTab
  ) => void;

  onViewApplicants?: (
    filterPatch:
      Partial<ApplicantSearchQuery>
  ) => void;

  onOpenDuplicateReview?: () => void;

  onOpenDrilldown?: (
    type:
      ApplicantAnalyticsDrilldownType
  ) => void;
}


export function AnalyticsOverview({
  analytics,
  onNavigateTab,
  onViewApplicants,
  onOpenDuplicateReview,
  onOpenDrilldown,
}: AnalyticsOverviewProps) {
  const action =
    analytics.management
      .actionCenter;

  const priorities = [
    {
      label:
        "Needs Review",

      value:
        action.newNeedingReview,

      detail:
        "New Applicants",

      icon:
        ClipboardCheck,

      onClick:
        () =>
          onViewApplicants?.({
            status:
              "applied",
          }),
    },

    {
      label:
        "Draft Evaluations",

      value:
        action.draftEvaluations,

      detail:
        "Evaluation work pending",

      icon:
        FileWarning,

      onClick:
        () =>
          onOpenDrilldown?.(
            "draft_evaluation"
          ),
    },

    {
      label:
        "Upcoming Interviews",

      value:
        action.upcomingInterviews,

      detail:
        `Next ${action.upcomingInterviewWindowDays} days`,

      icon:
        CalendarClock,

      onClick:
        () =>
          onNavigateTab?.(
            "interviews"
          ),
    },

    {
      label:
        "Offer Decisions",

      value:
        action.awaitingOfferDecision,

      detail:
        "Applicants at Offered stage",

      icon:
        Gift,

      onClick:
        () =>
          onViewApplicants?.({
            status:
              "offered",
          }),
    },

    {
      label:
        "Duplicate Review",

      value:
        action.unresolvedDuplicateCases,

      detail:
        `${action.highConfidenceDuplicateCases} high confidence`,

      icon:
        CopyCheck,

      onClick:
        () =>
          onOpenDuplicateReview?.(),
    },

    {
      label:
        "Incomplete Profiles",

      value:
        action.incompleteProfiles,

      detail:
        "Missing defined profile fields",

      icon:
        AlertTriangle,

      onClick:
        () =>
          onOpenDrilldown?.(
            "incomplete_profile"
          ),
    },

    {
      label:
        "Overdue Tasks",

      value:
        analytics.notesTasks
          .overdueTasks,

      detail:
        "Internal tasks past due",

      icon:
        CalendarClock,

      onClick:
        () =>
          onOpenDrilldown?.(
            "overdue_task"
          ),
    },

    {
      label:
        "Calendar Errors",

      value:
        analytics.notesTasks
          .calendarSyncErrors,

      detail:
        "Internal Calendar sync errors",

      icon:
        AlertTriangle,

      onClick:
        () =>
          onOpenDrilldown?.(
            "calendar_sync_error"
          ),
    },

  ];


  return (
    <div className="space-y-5">
      <AnalyticsKpiCards
        analytics={
          analytics
        }
      />


      <Panel
        title="Action Center"
        subtitle="Recruitment work that currently requires attention. These values are calculated from stored Applicant, evaluation, interview, internal Notes/Tasks, duplicate, document, and profile data."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {priorities.map(
            item => {
              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.label
                  }
                  type="button"
                  onClick={
                    item.onClick
                  }
                  className={
                    `w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                      item.value >
                      0
                        ? "border-amber-200 bg-amber-50/70"
                        : "border-emerald-100 bg-emerald-50/40"
                    }`
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {
                          item.value
                        }
                      </p>
                    </div>

                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>

                  <p className="mt-2 text-[9px] leading-4 text-slate-400">
                    {
                      item.detail
                    }
                  </p>

                  <span className="mt-3 inline-block text-[9px] font-bold text-blue-600">
                    Open →
                  </span>
                </button>
              );
            }
          )}
        </div>
      </Panel>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Applications Over Time"
          subtitle="Monthly first-application volume and cumulative Applicant growth for the current cohort."
        >
          {analytics.trends
            .applications
            .length ===
          0 ? (
            <EmptyState />
          ) : (
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    analytics
                      .trends
                      .applications
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
                    name="New Applicants"
                    stroke="#2563eb"
                    strokeWidth={
                      2
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    stroke="#64748b"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>


        <Panel
          title="Current Pipeline Snapshot"
          subtitle="Current Applicant distribution across all controlled recruitment stages."
        >
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  analytics
                    .pipelineAnalytics
                    .stages
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
                  name="Applicants"
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


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Upcoming Interviews"
          subtitle={`Scheduled interviews during the next ${action.upcomingInterviewWindowDays} days.`}
        >
          {analytics.management
            .upcomingInterviews
            .length ===
          0 ? (
            <EmptyState text="No upcoming scheduled interviews in the current window." />
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

                    <th className="pb-2">
                      Schedule
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {analytics.management
                    .upcomingInterviews
                    .slice(
                      0,
                      8
                    )
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


        <Panel
          title="Recent Recruiter Feedback"
          subtitle="Latest submitted evaluation feedback and recommendation decisions."
        >
          {analytics.management
            .feedback
            .recent
            .length ===
          0 ? (
            <EmptyState text="No submitted evaluation feedback is available for this cohort." />
          ) : (
            <div className="space-y-3">
              {analytics.management
                .feedback
                .recent
                .slice(
                  0,
                  6
                )
                .map(
                  feedback => (
                    <div
                      key={
                        feedback.id
                      }
                      className="rounded-lg border border-slate-100 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800">
                          {
                            feedback.applicantName
                          }
                        </p>

                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase text-blue-700">
                          {
                            feedback.recommendation.replace(
                              /_/g,
                              " "
                            )
                          }
                        </span>
                      </div>

                      <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
                        <span>
                          Rating:{" "}
                          <strong>
                            {
                              feedback.averageRating ??
                              "—"
                            }
                          </strong>
                        </span>

                        <span>
                          Score:{" "}
                          <strong>
                            {
                              feedback.weightedScore ??
                              "—"
                            }
                          </strong>
                        </span>
                      </div>

                      {(feedback.summary ||
                        feedback.strengths ||
                        feedback.concerns) && (
                        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">
                          {
                            feedback.summary ||
                            feedback.strengths ||
                            feedback.concerns
                          }
                        </p>
                      )}
                    </div>
                  )
                )}
            </div>
          )}
        </Panel>
      </div>


      <Panel
        title="Recent Recruitment Activity"
        subtitle="Latest audited Applicant actions across status, evaluations, interviews, communications, profiles, documents, and lifecycle management."
      >
        {analytics.management
          .recentActivity
          .length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {analytics.management
              .recentActivity
              .slice(
                0,
                10
              )
              .map(
                activity => (
                  <div
                    key={
                      activity.id
                    }
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700">
                        {
                          activity.title ||
                          activity.type
                        }
                      </p>

                      <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-400">
                        {
                          activity.category
                        }
                      </p>
                    </div>

                    <span className="shrink-0 text-[9px] text-slate-400">
                      {formatDateTime(
                        activity.occurredAt
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
