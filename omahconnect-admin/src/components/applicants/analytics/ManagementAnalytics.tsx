import {
  AlertTriangle,
  CalendarX,
  ClipboardList,
  CopyCheck,
  FileText,
  Mail,
  MessageCircle,
  UserRoundSearch,
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
  BreakdownBarList,
  EmptyState,
  Panel,
  formatDateTime,
  formatPercent,
} from "./AnalyticsShared";


interface ManagementAnalyticsProps {
  analytics:
    ApplicantRecruitmentAnalytics;

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


export function ManagementAnalytics({
  analytics,
  onViewApplicants,
  onOpenDuplicateReview,
  onOpenDrilldown,
}: ManagementAnalyticsProps) {
  const management =
    analytics.management;

  const action =
    management.actionCenter;


  const priorities = [
    {
      label:
        "Needs Review",

      value:
        action.newNeedingReview,

      icon:
        UserRoundSearch,

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

      icon:
        ClipboardList,

      onClick:
        () =>
          onOpenDrilldown?.(
            "draft_evaluation"
          ),
    },

    {
      label:
        "Overdue Interviews",

      value:
        action.overdueScheduledInterviews,

      icon:
        CalendarX,

      onClick:
        () =>
          onOpenDrilldown?.(
            "overdue_interview"
          ),
    },

    {
      label:
        "No Shows",

      value:
        action.interviewNoShows,

      icon:
        AlertTriangle,

      onClick:
        () =>
          onOpenDrilldown?.(
            "no_show"
          ),
    },

    {
      label:
        "Duplicate Cases",

      value:
        action.unresolvedDuplicateCases,

      icon:
        CopyCheck,

      onClick:
        () =>
          onOpenDuplicateReview?.(),
    },

    {
      label:
        "Missing CV",

      value:
        action.applicantsMissingCv,

      icon:
        FileText,

      onClick:
        () =>
          onOpenDrilldown?.(
            "missing_cv"
          ),
    },
  ];


  const coveragePriorities = [
    {
      label:
        "No Submitted Evaluation",

      value:
        action.applicantsWithoutSubmittedEvaluation,

      icon:
        ClipboardList,

      type:
        "no_submitted_evaluation" as const,
    },

    {
      label:
        "No Interview",

      value:
        action.applicantsWithoutInterview,

      icon:
        CalendarX,

      type:
        "no_interview" as const,
    },

    {
      label:
        "High-Confidence Duplicates",

      value:
        action.highConfidenceDuplicateCases,

      icon:
        CopyCheck,

      type:
        "high_confidence_duplicate" as const,
    },
  ];


  return (
    <div className="space-y-5">
      <Panel
        title="Recruitment Priority Center"
        subtitle="Operational items that currently require recruiter or management attention."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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
                        : "border-emerald-100 bg-emerald-50/50"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 text-slate-500" />

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {
                      item.value
                    }
                  </p>

                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    {
                      item.label
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


      <Panel
        title="Operational Coverage Drill-Downs"
        subtitle="Exact Applicant lists for recruitment coverage gaps and high-confidence duplicate cases."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {coveragePriorities.map(
            item => {
              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.label
                  }
                  type="button"
                  onClick={() =>
                    onOpenDrilldown?.(
                      item.type
                    )
                  }
                  className={
                    `rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                      item.value >
                      0
                        ? "border-amber-200 bg-amber-50/70"
                        : "border-emerald-100 bg-emerald-50/50"
                    }`
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {
                          item.value
                        }
                      </p>

                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        {
                          item.label
                        }
                      </p>
                    </div>

                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>

                  <span className="mt-3 inline-block text-[9px] font-bold text-blue-600">
                    View exact records →
                  </span>
                </button>
              );
            }
          )}
        </div>
      </Panel>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Profile Data Quality"
          subtitle={`Defined profile-field coverage: ${formatPercent(
            management
              .dataQuality
              .profileFieldCoveragePercent
          )}. This uses the explicit dashboard completeness definition rather than a hidden score.`}
        >
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  management
                    .dataQuality
                    .fields
                }
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={
                    false
                  }
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
                  width={
                    105
                  }
                  tick={{
                    fontSize: 9,
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="coveragePercent"
                  name="Coverage %"
                  fill="#2563eb"
                  radius={[
                    0,
                    4,
                    4,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>


        <Panel
          title="Duplicate Review"
          subtitle={`${management.duplicates.unresolved} unresolved cases; ${management.duplicates.highConfidenceUnresolved} are high confidence.`}
        >
          <BreakdownBarList
            data={
              management
                .duplicates
                .statuses
            }
          />

          {management.duplicates
            .recentUnresolved
            .length >
            0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Recent unresolved
              </p>

              <div className="space-y-2">
                {management.duplicates
                  .recentUnresolved
                  .slice(
                    0,
                    5
                  )
                  .map(
                    duplicate => (
                      <div
                        key={
                          duplicate.id
                        }
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2 text-[10px]"
                      >
                        <span className="text-slate-600">
                          {
                            duplicate.matchedSignals.join(
                              ", "
                            ) ||
                            "identity match"
                          }
                        </span>

                        <span className="rounded-full bg-amber-100 px-2 py-1 font-bold uppercase text-amber-700">
                          {
                            duplicate.confidence
                          }
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>
          )}
        </Panel>
      </div>


      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Document Coverage"
          subtitle={`CV coverage: ${formatPercent(
            management
              .documents
              .cvCoveragePercent
          )}`}
        >
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-lg font-bold text-slate-900">
                {
                  management
                    .documents
                    .currentActive
                }
              </p>

              <p className="text-[9px] text-slate-400">
                Active documents
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-lg font-bold text-slate-900">
                {
                  management
                    .documents
                    .applicantsWithCv
                }
              </p>

              <p className="text-[9px] text-slate-400">
                With CV
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-lg font-bold text-slate-900">
                {
                  management
                    .documents
                    .applicantsMissingCv
                }
              </p>

              <p className="text-[9px] text-slate-400">
                Missing CV
              </p>
            </div>
          </div>

          <BreakdownBarList
            data={
              management
                .documents
                .types
            }
            limit={
              7
            }
          />
        </Panel>


        <Panel
          title="Submission History"
          subtitle="Immutable Applicant form submission records."
        >
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-900">
                {
                  management
                    .submissions
                    .total
                }
              </p>

              <p className="text-[9px] text-slate-400">
                Total submissions
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-900">
                {
                  management
                    .submissions
                    .applicantsWithMultipleSubmissions
                }
              </p>

              <p className="text-[9px] text-slate-400">
                Multiple submissions
              </p>
            </div>
          </div>

          <BreakdownBarList
            data={
              management
                .submissions
                .sources
            }
          />
        </Panel>


        <Panel
          title="Historical Submission Status"
          subtitle="Legacy immutable submission statuses, kept separate from the master Applicant pipeline."
        >
          <BreakdownBarList
            data={
              management
                .submissions
                .historicalStatuses
            }
          />
        </Panel>
      </div>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Communication Activity"
          subtitle="Audited successful Applicant email and WhatsApp sends."
        >
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <Mail className="h-4 w-4 text-blue-600" />

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {
                  management
                    .communications
                    .emailSent
                }
              </p>

              <p className="text-[9px] text-slate-500">
                Emails sent
              </p>
            </div>

            <div className="rounded-lg bg-emerald-50 p-4">
              <MessageCircle className="h-4 w-4 text-emerald-600" />

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {
                  management
                    .communications
                    .whatsappSent
                }
              </p>

              <p className="text-[9px] text-slate-500">
                WhatsApp sent
              </p>
            </div>
          </div>

          {management
            .communications
            .trend.length ===
          0 ? (
            <EmptyState />
          ) : (
            <div className="h-52">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    management
                      .communications
                      .trend
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
                      fontSize: 9,
                    }}
                  />

                  <YAxis
                    allowDecimals={
                      false
                    }
                    tick={{
                      fontSize: 9,
                    }}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="email"
                    stackId="comms"
                    fill="#2563eb"
                    name="Email"
                  />

                  <Bar
                    dataKey="whatsapp"
                    stackId="comms"
                    fill="#16a34a"
                    name="WhatsApp"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>


        <Panel
          title="Submissions Over Time"
          subtitle="Monthly immutable form submission activity."
        >
          {management
            .submissions
            .trend.length ===
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
                    management
                      .submissions
                      .trend
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
                    stroke="#0f766e"
                    strokeWidth={
                      2
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>


      <Panel
        title="Operational Activity Feed"
        subtitle="Latest audited Applicant-management events."
      >
        {management
          .recentActivity
          .length ===
        0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {management.recentActivity.map(
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

                    <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-400">
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
