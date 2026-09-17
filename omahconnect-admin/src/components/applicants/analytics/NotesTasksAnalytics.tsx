import {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Cloud,
  Link2,
  RefreshCcw,
  Star,
  UserRound,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ApplicantAnalyticsDrilldownType,
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";

import {
  Panel,
} from "./AnalyticsShared";


interface NotesTasksAnalyticsProps {
  analytics:
    ApplicantRecruitmentAnalytics;

  onOpenDrilldown?: (
    type:
      ApplicantAnalyticsDrilldownType
  ) => void;
}


type TimeGranularity =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly";


interface MetricDefinition {
  label: string;

  value:
    number |
    string;

  detail: string;

  state: string;

  type?:
    ApplicantAnalyticsDrilldownType;
}


const TASK_STATUS_COLORS = [
  "#2563eb",
  "#10b981",
];


const CALENDAR_COLORS = [
  "#10b981",
  "#94a3b8",
  "#f59e0b",
  "#ef4444",
];


function timeWindowLabel(
  granularity:
    TimeGranularity
) {
  switch (
    granularity
  ) {
    case "hourly":
      return "Last 24 Hours";

    case "weekly":
      return "Last 12 Weeks";

    case "monthly":
      return "Last 12 Months";

    default:
      return "Last 30 Days";
  }
}


function formatTemporalLabel(
  start: string,
  granularity:
    TimeGranularity
) {
  const date =
    new Date(start);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return start;
  }


  if (
    granularity ===
    "hourly"
  ) {
    return date.toLocaleTimeString(
      [],
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }


  if (
    granularity ===
    "monthly"
  ) {
    return date.toLocaleDateString(
      [],
      {
        month:
          "short",

        year:
          "2-digit",
      }
    );
  }


  if (
    granularity ===
    "weekly"
  ) {
    return date.toLocaleDateString(
      [],
      {
        month:
          "short",

        day:
          "numeric",
      }
    );
  }


  return date.toLocaleDateString(
    [],
    {
      month:
        "short",

      day:
        "numeric",
    }
  );
}


function stateClass(
  state: string
) {
  switch (
    state
  ) {
    case "Attention":
    case "Error":
      return "bg-rose-100 text-rose-700";

    case "Action":
    case "Today":
      return "bg-amber-100 text-amber-700";

    case "Synced":
    case "Done":
    case "Clear":
      return "bg-emerald-100 text-emerald-700";

    case "Optional":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-blue-100 text-blue-700";
  }
}


function MetricCard({
  metric,
  onOpenDrilldown,
}: {
  metric:
    MetricDefinition;

  onOpenDrilldown?:
    (
      type:
        ApplicantAnalyticsDrilldownType
    ) => void;
}) {
  const clickable =
    Boolean(
      metric.type &&
      onOpenDrilldown
    );


  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          {
            metric.label
          }
        </p>

        <span
          className={
            `rounded-full px-2 py-0.5 text-[8px] font-bold ${stateClass(
              metric.state
            )}`
          }
        >
          {
            metric.state
          }
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {
          metric.value
        }
      </p>

      <p className="mt-1 text-[9px] leading-4 text-slate-400">
        {
          metric.detail
        }
      </p>

      {clickable && (
        <span className="mt-3 inline-block text-[9px] font-bold text-blue-600">
          View Applicants →
        </span>
      )}
    </>
  );


  if (
    !clickable ||
    !metric.type
  ) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        {content}
      </div>
    );
  }


  return (
    <button
      type="button"
      onClick={() =>
        onOpenDrilldown?.(
          metric.type!
        )
      }
      className="w-full rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
    >
      {content}
    </button>
  );
}


function FlowNode({
  title,
  detail,
  tone =
    "slate",
}: {
  title: string;
  detail: string;

  tone?:
    | "slate"
    | "blue"
    | "amber"
    | "emerald"
    | "rose";
}) {
  const classes = {
    slate:
      "border-slate-200 bg-white text-slate-700",

    blue:
      "border-blue-200 bg-blue-50 text-blue-700",

    amber:
      "border-amber-200 bg-amber-50 text-amber-700",

    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    rose:
      "border-rose-200 bg-rose-50 text-rose-700",
  };


  return (
    <div
      className={
        `min-w-0 flex-1 rounded-xl border p-3 text-center ${classes[tone]}`
      }
    >
      <p className="text-[10px] font-bold">
        {title}
      </p>

      <p className="mt-1 text-[8px] leading-4 opacity-75">
        {detail}
      </p>
    </div>
  );
}


function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center px-1 py-1">
      <ArrowRight className="hidden h-4 w-4 text-slate-300 md:block" />

      <ArrowDown className="h-4 w-4 text-slate-300 md:hidden" />
    </div>
  );
}


export function NotesTasksAnalytics({
  analytics,
  onOpenDrilldown,
}: NotesTasksAnalyticsProps) {
  const data =
    analytics.notesTasks;


  const [
    granularity,
    setGranularity,
  ] =
    useState<TimeGranularity>(
      "daily"
    );


  const temporalSeries =
    useMemo(
      () =>
        data.temporalViews[
          granularity
        ].map(
          point => ({
            ...point,

            label:
              formatTemporalLabel(
                point.start,
                granularity
              ),
          })
        ),
      [
        data.temporalViews,
        granularity,
      ]
    );


  const ownerChartData =
    useMemo(
      () =>
        data.ownerWorkload
          .slice(
            0,
            10
          )
          .map(
            owner => ({
              ...owner,

              otherOpenTasks:
                Math.max(
                  0,

                  owner.openTasks -
                    owner.overdueTasks -
                    owner.dueTodayTasks -
                    owner.upcomingTasks
                ),
            })
          ),
      [
        data.ownerWorkload,
      ]
    );


  const taskMetrics:
    MetricDefinition[] = [
      {
        label:
          "Open Tasks",

        value:
          data.openTasks,

        detail:
          "Active tasks not completed",

        state:
          "Active",

        type:
          "open_task",
      },

      {
        label:
          "Overdue",

        value:
          data.overdueTasks,

        detail:
          "Open tasks past their due date",

        state:
          data.overdueTasks >
          0
            ? "Attention"
            : "Clear",

        type:
          "overdue_task",
      },

      {
        label:
          "Due Today",

        value:
          data.dueTodayTasks,

        detail:
          "Tasks due today",

        state:
          "Today",

        type:
          "due_today_task",
      },

      {
        label:
          "Upcoming",

        value:
          data.upcomingTasks,

        detail:
          `Next ${data.upcomingWindowDays} days`,

        state:
          "Planned",

        type:
          "upcoming_task",
      },

      {
        label:
          "Completed",

        value:
          data.completedTasks,

        detail:
          "Completed internal tasks",

        state:
          "Done",

        type:
          "completed_task",
      },

      {
        label:
          "Completion Rate",

        value:
          `${data.completionRate.toFixed(
            1
          )}%`,

        detail:
          `${data.completedTasks} of ${data.totalTasks} tasks`,

        state:
          "Performance",
      },

      {
        label:
          "Reminders",

        value:
          data.scheduledReminders,

        detail:
          "Internal reminders scheduled",

        state:
          "Scheduled",

        type:
          "scheduled_reminder",
      },

      {
        label:
          "Important",

        value:
          data.importantItems,

        detail:
          "Important notes and tasks",

        state:
          "Priority",

        type:
          "important_internal_item",
      },
    ];


  const calendarMetrics:
    MetricDefinition[] = [
      {
        label:
          "Calendar Synced",

        value:
          data.calendarSyncedItems,

        detail:
          "Linked and synchronized",

        state:
          "Synced",

        type:
          "calendar_synced_internal_item",
      },

      {
        label:
          "Not Added",

        value:
          data.calendarNotLinkedScheduled,

        detail:
          "Schedule-ready but not explicitly added",

        state:
          "Optional",

        type:
          "calendar_not_linked_scheduled",
      },

      {
        label:
          "Needs Update",

        value:
          data.calendarNeedsUpdate,

        detail:
          "Linked event changed locally",

        state:
          data.calendarNeedsUpdate >
          0
            ? "Action"
            : "Clear",

        type:
          "calendar_needs_update",
      },

      {
        label:
          "Sync Error",

        value:
          data.calendarSyncErrors,

        detail:
          "Provider synchronization failed",

        state:
          data.calendarSyncErrors >
          0
            ? "Error"
            : "Clear",

        type:
          "calendar_sync_error",
      },
    ];


  const operationalMetrics =
    [
      ...taskMetrics,
      ...calendarMetrics,
    ];


  return (
    <div className="space-y-5">
      {/* ==================================================
          1. KPI CARDS
      ================================================== */}

      <Panel
        title="Internal Notes & Tasks"
        subtitle="Operational intelligence across Applicant notes, tasks, reminders, deadlines, ownership, priority, and explicit Calendar synchronization."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <ClipboardList className="h-4 w-4 text-blue-600" />

            <p className="mt-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Total Tasks
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                data.totalTasks
              }
            </p>

            <p className="mt-1 text-[9px] text-slate-400">
              {
                data.openTasks
              }{" "}
              open ·{" "}
              {
                data.completedTasks
              }{" "}
              completed
            </p>
          </div>


          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <CircleDashed className="h-4 w-4 text-slate-500" />

            <p className="mt-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Internal Notes
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                data.totalNotes
              }
            </p>

            <p className="mt-1 text-[9px] text-slate-400">
              {
                data.scheduledNotes
              }{" "}
              scheduled
            </p>
          </div>


          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <Bell className="h-4 w-4 text-amber-600" />

            <p className="mt-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Reminders
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                data.scheduledReminders
              }
            </p>

            <p className="mt-1 text-[9px] text-slate-400">
              Configured internal reminders
            </p>
          </div>


          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
            <Star className="h-4 w-4 text-violet-600" />

            <p className="mt-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Important Items
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {
                data.importantItems
              }
            </p>

            <p className="mt-1 text-[9px] text-slate-400">
              Priority notes and tasks
            </p>
          </div>
        </div>
      </Panel>


      {/* ==================================================
          2. TIME INTELLIGENCE + MULTI-SERIES AREA CHART
      ================================================== */}

      <Panel
        title={`Operational Activity · ${timeWindowLabel(
          granularity
        )}`}
        subtitle="Switch between hourly, daily, weekly, and monthly activity using real stored timestamps."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              {
                id:
                  "hourly" as const,

                label:
                  "Hourly",
              },

              {
                id:
                  "daily" as const,

                label:
                  "Daily",
              },

              {
                id:
                  "weekly" as const,

                label:
                  "Weekly",
              },

              {
                id:
                  "monthly" as const,

                label:
                  "Monthly",
              },
            ].map(
              option => (
                <button
                  key={
                    option.id
                  }
                  type="button"
                  onClick={() =>
                    setGranularity(
                      option.id
                    )
                  }
                  className={
                    `rounded-md px-3 py-1.5 text-[9px] font-bold transition ${
                      granularity ===
                      option.id
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`
                  }
                >
                  {
                    option.label
                  }
                </button>
              )
            )}
          </div>

          <p className="text-[9px] text-slate-400">
            Hourly 24h · Daily 30d · Weekly 12w · Monthly 12m
          </p>
        </div>


        <div className="h-[360px] w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={
                temporalSeries
              }
              margin={{
                top:
                  10,

                right:
                  16,

                left:
                  -12,

                bottom:
                  0,
              }}
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
                  fontSize:
                    9,
                }}
                interval="preserveStartEnd"
              />

              <YAxis
                allowDecimals={
                  false
                }
                tick={{
                  fontSize:
                    9,
                }}
              />

              <Tooltip />

              <Legend
                wrapperStyle={{
                  fontSize:
                    "10px",
                }}
              />

              <Area
                type="monotone"
                dataKey="tasksCreated"
                name="Tasks Created"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.10}
              />

              <Area
                type="monotone"
                dataKey="tasksCompleted"
                name="Tasks Completed"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.08}
              />

              <Area
                type="monotone"
                dataKey="notesCreated"
                name="Notes Created"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.08}
              />

              <Area
                type="monotone"
                dataKey="remindersScheduled"
                name="Reminders Scheduled"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.08}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>


      {/* ==================================================
          KPI OPERATIONAL CARDS
      ================================================== */}

      <Panel
        title="Task Operations"
        subtitle="Current task workload and deadline state. Click an actionable metric to inspect the exact matching Applicants."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {taskMetrics.map(
            metric => (
              <MetricCard
                key={
                  metric.label
                }
                metric={
                  metric
                }
                onOpenDrilldown={
                  onOpenDrilldown
                }
              />
            )
          )}
        </div>
      </Panel>


      {/* ==================================================
          3 + 4 TASK DONUT / DUE BAR
      ================================================== */}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Task Status"
          subtitle="Current Open versus Completed task distribution."
        >
          <div className="h-[310px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={
                    data.taskStatusDistribution
                  }
                  dataKey="count"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {data.taskStatusDistribution.map(
                    (
                      item,
                      index
                    ) => (
                      <Cell
                        key={
                          item.key
                        }
                        fill={
                          TASK_STATUS_COLORS[
                            index %
                            TASK_STATUS_COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend
                  wrapperStyle={{
                    fontSize:
                      "10px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>


        <Panel
          title="Due-Date Distribution"
          subtitle="Open tasks classified by overdue, today, upcoming, later, or unscheduled."
        >
          <div className="h-[310px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  data.dueDistribution
                }
                margin={{
                  top:
                    10,

                  right:
                    12,

                  left:
                    -10,

                  bottom:
                    0,
                }}
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
                    fontSize:
                      9,
                  }}
                />

                <YAxis
                  allowDecimals={
                    false
                  }
                  tick={{
                    fontSize:
                      9,
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Tasks"
                  fill="#2563eb"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>


      {/* ==================================================
          5. CALENDAR SYNC DONUT
      ================================================== */}

      <Panel
        title="Calendar Synchronization Intelligence"
        subtitle="Explicit Google Calendar synchronization state. Not Added is informational and never treated as an automatic failure."
      >
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <div className="h-[320px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={
                    data.calendarDistribution
                  }
                  dataKey="count"
                  nameKey="label"
                  innerRadius={65}
                  outerRadius={96}
                  paddingAngle={3}
                >
                  {data.calendarDistribution.map(
                    (
                      item,
                      index
                    ) => (
                      <Cell
                        key={
                          item.key
                        }
                        fill={
                          CALENDAR_COLORS[
                            index %
                            CALENDAR_COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend
                  wrapperStyle={{
                    fontSize:
                      "10px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>


          <div className="grid content-start gap-3 sm:grid-cols-2">
            {calendarMetrics.map(
              metric => (
                <MetricCard
                  key={
                    metric.label
                  }
                  metric={
                    metric
                  }
                  onOpenDrilldown={
                    onOpenDrilldown
                  }
                />
              )
            )}
          </div>
        </div>
      </Panel>


      {/* ==================================================
          6. STACKED OWNER WORKLOAD
      ================================================== */}

      <Panel
        title="Open Task Workload by Owner"
        subtitle="Stacked workload uses the current internal-item author as operational owner because the model does not contain a separate assignee."
      >
        {ownerChartData.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
            <UserRound className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-xs font-semibold text-slate-500">
              No open task workload in the selected cohort.
            </p>
          </div>
        ) : (
          <div className="h-[380px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  ownerChartData
                }
                layout="vertical"
                margin={{
                  top:
                    10,

                  right:
                    18,

                  left:
                    24,

                  bottom:
                    0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={
                    false
                  }
                />

                <XAxis
                  type="number"
                  allowDecimals={
                    false
                  }
                  tick={{
                    fontSize:
                      9,
                  }}
                />

                <YAxis
                  type="category"
                  dataKey="label"
                  width={115}
                  tick={{
                    fontSize:
                      9,
                  }}
                />

                <Tooltip />

                <Legend
                  wrapperStyle={{
                    fontSize:
                      "10px",
                  }}
                />

                <Bar
                  dataKey="overdueTasks"
                  name="Overdue"
                  stackId="open"
                  fill="#ef4444"
                />

                <Bar
                  dataKey="dueTodayTasks"
                  name="Due Today"
                  stackId="open"
                  fill="#f59e0b"
                />

                <Bar
                  dataKey="upcomingTasks"
                  name="Upcoming"
                  stackId="open"
                  fill="#2563eb"
                />

                <Bar
                  dataKey="otherOpenTasks"
                  name="Later / Unscheduled"
                  stackId="open"
                  fill="#94a3b8"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>


      {/* ==================================================
          7. DETAILED WORKLOAD TABLE
      ================================================== */}

      <Panel
        title="Detailed Owner Workload"
        subtitle="Exact open workload counts by operational owner."
      >
        {data.ownerWorkload.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            No open tasks in the selected cohort.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-3">
                    Owner
                  </th>

                  <th className="px-3 py-3 text-right">
                    Open
                  </th>

                  <th className="px-3 py-3 text-right">
                    Overdue
                  </th>

                  <th className="px-3 py-3 text-right">
                    Due Today
                  </th>

                  <th className="px-3 py-3 text-right">
                    Upcoming
                  </th>

                  <th className="px-3 py-3 text-right">
                    Later / Unscheduled
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.ownerWorkload.map(
                  owner => {
                    const other =
                      Math.max(
                        0,

                        owner.openTasks -
                          owner.overdueTasks -
                          owner.dueTodayTasks -
                          owner.upcomingTasks
                      );

                    return (
                      <tr
                        key={
                          owner.key
                        }
                        className="border-b border-slate-50 text-xs"
                      >
                        <td className="px-3 py-3 font-semibold text-slate-700">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-3.5 w-3.5 text-slate-400" />

                            {
                              owner.label
                            }
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right font-bold text-slate-800">
                          {
                            owner.openTasks
                          }
                        </td>

                        <td className="px-3 py-3 text-right font-bold text-rose-600">
                          {
                            owner.overdueTasks
                          }
                        </td>

                        <td className="px-3 py-3 text-right font-bold text-amber-600">
                          {
                            owner.dueTodayTasks
                          }
                        </td>

                        <td className="px-3 py-3 text-right font-bold text-blue-600">
                          {
                            owner.upcomingTasks
                          }
                        </td>

                        <td className="px-3 py-3 text-right font-bold text-slate-500">
                          {
                            other
                          }
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>


      {/* ==================================================
          8. OPERATIONAL METRICS TABLE
      ================================================== */}

      <Panel
        title="Operational Metrics Matrix"
        subtitle="Management table combining current value, interpretation, operational state, and exact Applicant drill-down where available."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">
                  Metric
                </th>

                <th className="px-3 py-3">
                  Current Value
                </th>

                <th className="px-3 py-3">
                  Meaning
                </th>

                <th className="px-3 py-3">
                  State
                </th>

                <th className="px-3 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {operationalMetrics.map(
                metric => (
                  <tr
                    key={
                      metric.label
                    }
                    className="border-b border-slate-50 text-xs"
                  >
                    <td className="px-3 py-3 font-bold text-slate-800">
                      {
                        metric.label
                      }
                    </td>

                    <td className="px-3 py-3 text-lg font-bold text-slate-900">
                      {
                        metric.value
                      }
                    </td>

                    <td className="max-w-sm px-3 py-3 text-[10px] text-slate-500">
                      {
                        metric.detail
                      }
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={
                          `rounded-full px-2 py-1 text-[8px] font-bold ${stateClass(
                            metric.state
                          )}`
                        }
                      >
                        {
                          metric.state
                        }
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right">
                      {metric.type ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenDrilldown?.(
                              metric.type!
                            )
                          }
                          className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-[9px] font-bold text-blue-600 hover:bg-blue-50"
                        >
                          View Applicants
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-300">
                          Summary only
                        </span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Panel>


      {/* ==================================================
          9. NOTES/TASKS LIFECYCLE DIAGRAM
      ================================================== */}

      <Panel
        title="Notes / Tasks Lifecycle"
        subtitle="Operational workflow diagram. This describes the current process and does not claim historical transition counts."
      >
        <div className="flex flex-col items-stretch gap-1 md:flex-row md:items-center">
          <FlowNode
            title="1. Create"
            detail="Internal Note or Task"
            tone="blue"
          />

          <FlowArrow />

          <FlowNode
            title="2. Prioritize"
            detail="Important flag, author and task state"
          />

          <FlowArrow />

          <FlowNode
            title="3. Schedule"
            detail="Start, end and optional reminder"
            tone="amber"
          />

          <FlowArrow />

          <FlowNode
            title="4. Execute"
            detail="Review, follow-up and local edits"
          />

          <FlowArrow />

          <FlowNode
            title="5. Resolve"
            detail="Complete Task or archive item"
            tone="emerald"
          />
        </div>

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-[9px] leading-4 text-slate-500">
          <ClipboardList className="mr-1 inline h-3.5 w-3.5" />
          Calendar synchronization is an optional side workflow. Creating or scheduling an internal item does not automatically create an external Calendar event.
        </div>
      </Panel>


      {/* ==================================================
          10 + 11. GOOGLE CALENDAR SYNC FLOWCHART
      ================================================== */}

      <Panel
        title="Google Calendar Synchronization Flow"
        subtitle="Explicit synchronization lifecycle with clear separation between local scheduling and external provider state."
      >
        <div className="space-y-5">
          <div className="flex flex-col items-stretch gap-1 md:flex-row md:items-center">
            <FlowNode
              title="Schedule Ready"
              detail="Valid local start/end dates"
              tone="blue"
            />

            <FlowArrow />

            <FlowNode
              title="Not Added"
              detail="Default local-only state"
              tone="slate"
            />

            <FlowArrow />

            <FlowNode
              title="Explicit Add"
              detail="User deliberately adds Calendar event"
              tone="blue"
            />

            <FlowArrow />

            <FlowNode
              title="Synced"
              detail="External event linked and current"
              tone="emerald"
            />
          </div>


          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <RefreshCcw className="h-4 w-4 text-amber-600" />

              <p className="mt-2 text-[10px] font-bold text-amber-800">
                Needs Update
              </p>

              <p className="mt-1 text-[9px] leading-4 text-amber-700">
                A linked internal item was edited locally. The external event remains unchanged until the user explicitly chooses Update Calendar.
              </p>
            </div>


            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <AlertTriangle className="h-4 w-4 text-rose-600" />

              <p className="mt-2 text-[10px] font-bold text-rose-800">
                Sync Error
              </p>

              <p className="mt-1 text-[9px] leading-4 text-rose-700">
                The provider operation failed. The error remains visible for deliberate retry or investigation.
              </p>
            </div>


            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <Link2 className="h-4 w-4 text-blue-600" />

              <p className="mt-2 text-[10px] font-bold text-blue-800">
                Explicit Remove
              </p>

              <p className="mt-1 text-[9px] leading-4 text-blue-700">
                External Calendar removal is a deliberate action. Local Notes/Tasks remain stored independently.
              </p>
            </div>
          </div>


          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <CircleDashed className="h-4 w-4 text-slate-500" />

              <p className="mt-2 text-xs font-bold text-slate-800">
                Not Added
              </p>

              <p className="mt-1 text-[9px] text-slate-500">
                {
                  data.calendarNotLinkedScheduled
                }{" "}
                schedule-ready items
              </p>

              <p className="mt-2 text-[8px] leading-4 text-slate-400">
                Informational. No external event exists.
              </p>
            </div>


            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />

              <p className="mt-2 text-xs font-bold text-emerald-800">
                Synced
              </p>

              <p className="mt-1 text-[9px] text-emerald-600">
                {
                  data.calendarSyncedItems
                }{" "}
                linked items
              </p>

              <p className="mt-2 text-[8px] leading-4 text-emerald-600">
                Local item and external event are current.
              </p>
            </div>


            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <CalendarClock className="h-4 w-4 text-amber-600" />

              <p className="mt-2 text-xs font-bold text-amber-800">
                Needs Update
              </p>

              <p className="mt-1 text-[9px] text-amber-600">
                {
                  data.calendarNeedsUpdate
                }{" "}
                linked items
              </p>

              <p className="mt-2 text-[8px] leading-4 text-amber-600">
                Local change waiting for explicit provider update.
              </p>
            </div>


            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <Cloud className="h-4 w-4 text-rose-600" />

              <p className="mt-2 text-xs font-bold text-rose-800">
                Sync Error
              </p>

              <p className="mt-1 text-[9px] text-rose-600">
                {
                  data.calendarSyncErrors
                }{" "}
                failed items
              </p>

              <p className="mt-2 text-[8px] leading-4 text-rose-600">
                External synchronization requires attention.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
