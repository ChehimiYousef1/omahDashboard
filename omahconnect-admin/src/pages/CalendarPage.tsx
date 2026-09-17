import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  List,
  Loader2,
  RefreshCw,
  Rows3,
  UserRound,
  X,
} from "lucide-react";

import {
  fetchApplicantCalendarEvents,
  fetchApplicantMaster,
  fetchApplicantPipeline,
  type ApplicantCalendarEvent,
  type ApplicantCalendarSourceType,
  type ApplicantCalendarSyncStatus,
  type ApplicantMaster,
  type ApplicantPipelineDefinition,
} from "../services/api";

import {
  Header,
} from "../components/layout/Header";

import {
  ApplicantProfilePanel,
} from "../components/applicants/ApplicantProfilePanel";


type CalendarView =
  | "month"
  | "week"
  | "agenda";


function isSafeExternalUrl(
  value: unknown
): value is string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return false;
  }

  try {
    const url =
      new URL(
        value.trim()
      );

    if (
      url.protocol ===
      "https:"
    ) {
      return true;
    }

    return (
      url.protocol ===
        "http:" &&
      (
        url.hostname ===
          "localhost" ||
        url.hostname ===
          "127.0.0.1" ||
        url.hostname ===
          "[::1]"
      )
    );
  } catch {
    return false;
  }
}


function startOfDay(
  value: Date
) {
  const result =
    new Date(value);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}


function endOfDay(
  value: Date
) {
  const result =
    new Date(value);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
}


function addDays(
  value: Date,
  amount: number
) {
  const result =
    new Date(value);

  result.setDate(
    result.getDate() +
    amount
  );

  return result;
}


function addMonths(
  value: Date,
  amount: number
) {
  const result =
    new Date(value);

  result.setMonth(
    result.getMonth() +
    amount
  );

  return result;
}


function startOfWeek(
  value: Date
) {
  const result =
    startOfDay(value);

  result.setDate(
    result.getDate() -
    result.getDay()
  );

  return result;
}


function endOfWeek(
  value: Date
) {
  return endOfDay(
    addDays(
      startOfWeek(value),
      6
    )
  );
}


function startOfMonth(
  value: Date
) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    1
  );
}


function endOfMonth(
  value: Date
) {
  return endOfDay(
    new Date(
      value.getFullYear(),
      value.getMonth() + 1,
      0
    )
  );
}


function calendarRange(
  view: CalendarView,
  anchor: Date
) {
  if (
    view === "week"
  ) {
    return {
      from:
        startOfWeek(anchor),

      to:
        endOfWeek(anchor),
    };
  }

  if (
    view === "agenda"
  ) {
    return {
      from:
        startOfDay(anchor),

      to:
        endOfDay(
          addDays(
            anchor,
            30
          )
        ),
    };
  }

  return {
    from:
      startOfWeek(
        startOfMonth(anchor)
      ),

    to:
      endOfWeek(
        endOfMonth(anchor)
      ),
  };
}


function localDayKey(
  value:
    | Date
    | string
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}


function formatTime(
  value?: string | null
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

  return date
    .toLocaleTimeString(
      [],
      {
        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
}


function formatDateTime(
  value?: string | null
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

  return date
    .toLocaleString(
      [],
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    );
}


function periodLabel(
  view: CalendarView,
  anchor: Date
) {
  if (
    view === "month"
  ) {
    return anchor
      .toLocaleDateString(
        [],
        {
          month:
            "long",

          year:
            "numeric",
        }
      );
  }

  if (
    view === "week"
  ) {
    const start =
      startOfWeek(
        anchor
      );

    const end =
      addDays(
        start,
        6
      );

    return (
      start.toLocaleDateString(
        [],
        {
          month:
            "short",

          day:
            "numeric",
        }
      ) +
      " – " +
      end.toLocaleDateString(
        [],
        {
          month:
            "short",

          day:
            "numeric",

          year:
            "numeric",
        }
      )
    );
  }

  const end =
    addDays(
      anchor,
      30
    );

  return (
    anchor.toLocaleDateString(
      [],
      {
        month:
          "short",

        day:
          "numeric",
      }
    ) +
    " – " +
    end.toLocaleDateString(
      [],
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    )
  );
}


function sourceLabel(
  source:
    ApplicantCalendarSourceType
) {
  switch (source) {
    case "interview":
      return "Interview";

    case "task":
      return "Task";

    case "scheduled_note":
      return "Scheduled Note";

    case "reminder":
      return "Reminder";

    default:
      return source;
  }
}


function sourceClass(
  source:
    ApplicantCalendarSourceType
) {
  switch (source) {
    case "interview":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "task":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "scheduled_note":
      return "border-slate-200 bg-slate-50 text-slate-700";

    case "reminder":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}


function syncClass(
  status:
    ApplicantCalendarSyncStatus
) {
  switch (status) {
    case "synced":
      return "bg-emerald-100 text-emerald-700";

    case "error":
      return "bg-rose-100 text-rose-700";

    default:
      return "bg-slate-100 text-slate-500";
  }
}


function isClosedStatus(
  status: string
) {
  return [
    "completed",
    "cancelled",
    "no_show",
  ].includes(
    String(
      status ||
      ""
    ).toLowerCase()
  );
}


function errorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error ===
      "object" &&
    "response" in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              error?: string;
            };
          };
        }
      ).response;

    if (
      response
        ?.data
        ?.error
    ) {
      return response
        .data
        .error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to load Calendar.";
}


function EventChip({
  event,
  onClick,
}: {
  event:
    ApplicantCalendarEvent;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      title={
        event.title
      }
      className={
        `block w-full truncate rounded-md border px-2 py-1 text-left text-[9px] font-semibold transition hover:brightness-95 ${sourceClass(
          event.sourceType
        )}`
      }
    >
      <span className="mr-1 opacity-70">
        {
          formatTime(
            event.start
          )
        }
      </span>

      {event.title}
    </button>
  );
}


export function CalendarPage() {
  const [
    view,
    setView,
  ] =
    useState<CalendarView>(
      "month"
    );

  const [
    anchor,
    setAnchor,
  ] =
    useState(
      () =>
        new Date()
    );

  const [
    events,
    setEvents,
  ] =
    useState<
      ApplicantCalendarEvent[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    sourceFilter,
    setSourceFilter,
  ] =
    useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  const [
    syncFilter,
    setSyncFilter,
  ] =
    useState("all");

  const [
    ownerInput,
    setOwnerInput,
  ] =
    useState("");

  const [
    ownerFilter,
    setOwnerFilter,
  ] =
    useState("");

  const [
    selectedEvent,
    setSelectedEvent,
  ] =
    useState<
      ApplicantCalendarEvent |
      null
    >(null);

  const [
    selectedApplicant,
    setSelectedApplicant,
  ] =
    useState<
      ApplicantMaster |
      null
    >(null);

  const [
    pipeline,
    setPipeline,
  ] =
    useState<
      ApplicantPipelineDefinition |
      null
    >(null);

  const [
    openingApplicant,
    setOpeningApplicant,
  ] =
    useState(false);


  const range =
    useMemo(
      () =>
        calendarRange(
          view,
          anchor
        ),
      [
        view,
        anchor,
      ]
    );


  const loadEvents =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const result =
            await fetchApplicantCalendarEvents({
              from:
                range.from
                  .toISOString(),

              to:
                range.to
                  .toISOString(),

              sourceTypes:
                sourceFilter ===
                  "all"
                  ? undefined
                  : sourceFilter,

              statuses:
                statusFilter ===
                  "all"
                  ? undefined
                  : statusFilter,

              syncStatuses:
                syncFilter ===
                  "all"
                  ? undefined
                  : syncFilter,

              owner:
                ownerFilter ||
                undefined,
            });

          setEvents(
            result.events
          );
        } catch (loadError) {
          setError(
            errorMessage(
              loadError
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [
        range.from,
        range.to,
        sourceFilter,
        statusFilter,
        syncFilter,
        ownerFilter,
      ]
    );


  useEffect(
    () => {
      void loadEvents();
    },
    [
      loadEvents,
    ]
  );


  useEffect(
    () => {
      let active =
        true;

      async function loadPipeline() {
        try {
          const result =
            await fetchApplicantPipeline();

          if (active) {
            setPipeline(
              result
            );
          }
        } catch {
          /*
           * Calendar remains usable even if
           * pipeline metadata is temporarily
           * unavailable.
           */
        }
      }

      void loadPipeline();

      return () => {
        active =
          false;
      };
    },
    []
  );


  const eventsByDay =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            ApplicantCalendarEvent[]
          >();

        for (
          const event
          of events
        ) {
          const key =
            localDayKey(
              event.start
            );

          if (!key) {
            continue;
          }

          const items =
            map.get(key) ||
            [];

          items.push(
            event
          );

          map.set(
            key,
            items
          );
        }

        return map;
      },
      [
        events,
      ]
    );


  const now =
    new Date();

  const todayKey =
    localDayKey(
      now
    );

  const todayCount =
    events.filter(
      event =>
        localDayKey(
          event.start
        ) ===
        todayKey
    ).length;

  const upcomingCount =
    events.filter(
      event =>
        new Date(
          event.start
        ) >
          now &&
        !isClosedStatus(
          event.status
        )
    ).length;

  const overdueCount =
    events.filter(
      event =>
        new Date(
          event.start
        ) <
          now &&
        !isClosedStatus(
          event.status
        )
    ).length;

  const syncErrorCount =
    events.filter(
      event =>
        event
          .calendarSyncStatus ===
        "error"
    ).length;


  function movePeriod(
    direction: number
  ) {
    setSelectedEvent(
      null
    );

    setAnchor(
      current => {
        if (
          view ===
          "month"
        ) {
          return addMonths(
            current,
            direction
          );
        }

        if (
          view ===
          "week"
        ) {
          return addDays(
            current,
            direction * 7
          );
        }

        return addDays(
          current,
          direction * 30
        );
      }
    );
  }


  async function openApplicant(
    applicantId:
      string
  ) {
    try {
      setOpeningApplicant(
        true
      );

      const applicant =
        await fetchApplicantMaster(
          applicantId
        );

      setSelectedApplicant(
        applicant
      );
    } catch (openError) {
      window.alert(
        errorMessage(
          openError
        )
      );
    } finally {
      setOpeningApplicant(
        false
      );
    }
  }


  async function refreshSelectedApplicant() {
    if (
      !selectedApplicant
    ) {
      return;
    }

    const applicant =
      await fetchApplicantMaster(
        selectedApplicant._id
      );

    setSelectedApplicant(
      applicant
    );

    await loadEvents();
  }


  const monthDays =
    useMemo(
      () => {
        const days:
          Date[] = [];

        let cursor =
          new Date(
            range.from
          );

        while (
          cursor <=
            range.to &&
          days.length <
            50
        ) {
          days.push(
            new Date(
              cursor
            )
          );

          cursor =
            addDays(
              cursor,
              1
            );
        }

        return days;
      },
      [
        range.from,
        range.to,
      ]
    );


  const weekDays =
    useMemo(
      () =>
        Array.from(
          {
            length: 7,
          },
          (
            _,
            index
          ) =>
            addDays(
              startOfWeek(
                anchor
              ),
              index
            )
        ),
      [
        anchor,
      ]
    );


  const agendaGroups =
    useMemo(
      () => {
        const groups =
          new Map<
            string,
            ApplicantCalendarEvent[]
          >();

        for (
          const event
          of events
        ) {
          const key =
            localDayKey(
              event.start
            );

          if (!key) {
            continue;
          }

          const current =
            groups.get(
              key
            ) ||
            [];

          current.push(
            event
          );

          groups.set(
            key,
            current
          );
        }

        return [
          ...groups.entries(),
        ].sort(
          (
            left,
            right
          ) =>
            left[0]
              .localeCompare(
                right[0]
              )
        );
      },
      [
        events,
      ]
    );


  return (
    <div className="space-y-5">
      <Header
        title="Calendar"
      />

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />

              <h2 className="text-lg font-bold text-slate-900">
                Recruitment Calendar
              </h2>
            </div>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Unified operational view of Applicant interviews, internal tasks, scheduled notes, and reminders. Viewing or refreshing this page never writes to Google Calendar.
            </p>
          </div>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={() =>
              void loadEvents()
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={
                `h-3.5 w-3.5 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`
              }
            />

            Refresh
          </button>
        </div>
      </section>


      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label:
              "Visible Events",

            value:
              events.length,

            detail:
              periodLabel(
                view,
                anchor
              ),
          },

          {
            label:
              "Today",

            value:
              todayCount,

            detail:
              "Scheduled today",
          },

          {
            label:
              "Upcoming",

            value:
              upcomingCount,

            detail:
              "Open future items",
          },

          {
            label:
              "Overdue",

            value:
              overdueCount,

            detail:
              "Open past items",
          },

          {
            label:
              "Sync Errors",

            value:
              syncErrorCount,

            detail:
              "Calendar attention",
          },
        ].map(
          item => (
            <div
              key={
                item.label
              }
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {
                  item.label
                }
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {
                  item.value
                }
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                {
                  item.detail
                }
              </p>
            </div>
          )
        )}
      </section>


      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                movePeriod(
                  -1
                )
              }
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setAnchor(
                  new Date()
                );

                setSelectedEvent(
                  null
                );
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() =>
                movePeriod(
                  1
                )
              }
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <p className="ml-1 text-sm font-bold text-slate-900">
              {
                periodLabel(
                  view,
                  anchor
                )
              }
            </p>
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              {
                id:
                  "month" as const,

                label:
                  "Month",

                icon:
                  CalendarDays,
              },

              {
                id:
                  "week" as const,

                label:
                  "Week",

                icon:
                  Rows3,
              },

              {
                id:
                  "agenda" as const,

                label:
                  "Agenda",

                icon:
                  List,
              },
            ].map(
              option => {
                const Icon =
                  option.icon;

                return (
                  <button
                    key={
                      option.id
                    }
                    type="button"
                    onClick={() => {
                      setView(
                        option.id
                      );

                      setSelectedEvent(
                        null
                      );
                    }}
                    className={
                      `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-bold transition ${
                        view ===
                        option.id
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />

                    {
                      option.label
                    }
                  </button>
                );
              }
            )}
          </div>
        </div>


        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-5">
          <select
            value={
              sourceFilter
            }
            onChange={
              event =>
                setSourceFilter(
                  event
                    .target
                    .value
                )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          >
            <option value="all">
              All event types
            </option>

            <option value="interview">
              Interviews
            </option>

            <option value="task">
              Tasks
            </option>

            <option value="scheduled_note">
              Scheduled Notes
            </option>

            <option value="reminder">
              Reminders
            </option>
          </select>


          <select
            value={
              statusFilter
            }
            onChange={
              event =>
                setStatusFilter(
                  event
                    .target
                    .value
                )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          >
            <option value="all">
              All statuses
            </option>

            <option value="scheduled">
              Scheduled
            </option>

            <option value="todo">
              To Do
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="cancelled">
              Cancelled
            </option>

            <option value="no_show">
              No Show
            </option>
          </select>


          <select
            value={
              syncFilter
            }
            onChange={
              event =>
                setSyncFilter(
                  event
                    .target
                    .value
                )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
          >
            <option value="all">
              All sync states
            </option>

            <option value="synced">
              Calendar Synced
            </option>

            <option value="not_synced">
              Not Synced
            </option>

            <option value="error">
              Sync Error
            </option>
          </select>


          <input
            value={
              ownerInput
            }
            onChange={
              event =>
                setOwnerInput(
                  event
                    .target
                    .value
                )
            }
            onKeyDown={
              event => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  setOwnerFilter(
                    ownerInput.trim()
                  );
                }
              }
            }
            placeholder="Owner name/email…"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setOwnerFilter(
                  ownerInput.trim()
                )
              }
              className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              Apply owner
            </button>

            <button
              type="button"
              title="Clear all filters"
              onClick={() => {
                setSourceFilter(
                  "all"
                );

                setStatusFilter(
                  "all"
                );

                setSyncFilter(
                  "all"
                );

                setOwnerInput(
                  ""
                );

                setOwnerFilter(
                  ""
                );
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
            >
              Clear
            </button>
          </div>
        </div>
      </section>


      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div>
              <p className="font-bold">
                Calendar could not be refreshed
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}


      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading &&
        events.length ===
          0 ? (
          <div className="flex min-h-[440px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />

              <p className="mt-3 text-xs text-slate-500">
                Loading Calendar…
              </p>
            </div>
          </div>
        ) : view ===
          "month" ? (
          <>
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {[
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ].map(
                day => (
                  <div
                    key={
                      day
                    }
                    className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map(
                day => {
                  const key =
                    localDayKey(
                      day
                    );

                  const dayEvents =
                    eventsByDay.get(
                      key
                    ) ||
                    [];

                  const inMonth =
                    day.getMonth() ===
                    anchor.getMonth();

                  const isToday =
                    key ===
                    todayKey;

                  return (
                    <div
                      key={
                        key
                      }
                      className={
                        `min-h-32 border-b border-r border-slate-100 p-2 ${
                          inMonth
                            ? "bg-white"
                            : "bg-slate-50/70"
                        }`
                      }
                    >
                      <div
                        className={
                          `mb-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                            isToday
                              ? "bg-blue-600 text-white"
                              : inMonth
                                ? "text-slate-700"
                                : "text-slate-300"
                          }`
                        }
                      >
                        {
                          day.getDate()
                        }
                      </div>

                      <div className="space-y-1">
                        {dayEvents
                          .slice(
                            0,
                            3
                          )
                          .map(
                            event => (
                              <EventChip
                                key={
                                  event.id
                                }
                                event={
                                  event
                                }
                                onClick={() =>
                                  setSelectedEvent(
                                    event
                                  )
                                }
                              />
                            )
                          )}

                        {dayEvents.length >
                          3 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEvent(
                                dayEvents[3]
                              )
                            }
                            className="text-[9px] font-semibold text-blue-600"
                          >
                            +
                            {
                              dayEvents.length -
                              3
                            }{" "}
                            more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        ) : view ===
          "week" ? (
          <div className="grid min-h-[520px] grid-cols-1 divide-y divide-slate-100 md:grid-cols-7 md:divide-x md:divide-y-0">
            {weekDays.map(
              day => {
                const key =
                  localDayKey(
                    day
                  );

                const dayEvents =
                  eventsByDay.get(
                    key
                  ) ||
                  [];

                return (
                  <div
                    key={
                      key
                    }
                    className="min-w-0 p-3"
                  >
                    <div className="mb-3 border-b border-slate-100 pb-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        {
                          day.toLocaleDateString(
                            [],
                            {
                              weekday:
                                "short",
                            }
                          )
                        }
                      </p>

                      <p
                        className={
                          `mt-1 text-lg font-bold ${
                            key ===
                            todayKey
                              ? "text-blue-600"
                              : "text-slate-900"
                          }`
                        }
                      >
                        {
                          day.getDate()
                        }
                      </p>
                    </div>

                    <div className="space-y-2">
                      {dayEvents.length ===
                        0 ? (
                        <p className="py-5 text-center text-[9px] text-slate-300">
                          No events
                        </p>
                      ) : (
                        dayEvents.map(
                          event => (
                            <button
                              key={
                                event.id
                              }
                              type="button"
                              onClick={() =>
                                setSelectedEvent(
                                  event
                                )
                              }
                              className={
                                `w-full rounded-lg border p-2 text-left ${sourceClass(
                                  event.sourceType
                                )}`
                              }
                            >
                              <p className="text-[9px] font-bold">
                                {
                                  formatTime(
                                    event.start
                                  )
                                }
                              </p>

                              <p className="mt-1 line-clamp-3 text-[10px] font-semibold">
                                {
                                  event.title
                                }
                              </p>
                            </button>
                          )
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {agendaGroups.length ===
              0 ? (
              <div className="py-20 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-200" />

                <p className="mt-3 text-sm font-semibold text-slate-500">
                  No Calendar events in this period
                </p>
              </div>
            ) : (
              agendaGroups.map(
                (
                  [
                    key,
                    dayEvents,
                  ]
                ) => {
                  const day =
                    new Date(
                      `${key}T12:00:00`
                    );

                  return (
                    <div
                      key={
                        key
                      }
                      className="grid gap-3 p-4 md:grid-cols-[150px_1fr]"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {
                            day.toLocaleDateString(
                              [],
                              {
                                weekday:
                                  "long",

                                month:
                                  "short",

                                day:
                                  "numeric",
                              }
                            )
                          }
                        </p>

                        {key ===
                          todayKey && (
                          <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {dayEvents.map(
                          event => (
                            <button
                              key={
                                event.id
                              }
                              type="button"
                              onClick={() =>
                                setSelectedEvent(
                                  event
                                )
                              }
                              className="flex w-full items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
                            >
                              <div className="w-16 shrink-0 text-[10px] font-bold text-slate-500">
                                {
                                  formatTime(
                                    event.start
                                  )
                                }
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={
                                      `rounded-full border px-2 py-0.5 text-[9px] font-bold ${sourceClass(
                                        event.sourceType
                                      )}`
                                    }
                                  >
                                    {
                                      sourceLabel(
                                        event.sourceType
                                      )
                                    }
                                  </span>

                                  <span
                                    className={
                                      `rounded-full px-2 py-0.5 text-[9px] font-bold ${syncClass(
                                        event.calendarSyncStatus
                                      )}`
                                    }
                                  >
                                    {
                                      event.calendarSyncStatus
                                    }
                                  </span>
                                </div>

                                <p className="mt-2 text-xs font-bold text-slate-900">
                                  {
                                    event.title
                                  }
                                </p>

                                <p className="mt-1 text-[10px] text-slate-500">
                                  {
                                    event.applicantName
                                  }
                                </p>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        )}
      </section>


      {selectedEvent && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/20 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={
                    `inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${sourceClass(
                      selectedEvent.sourceType
                    )}`
                  }
                >
                  {
                    sourceLabel(
                      selectedEvent.sourceType
                    )
                  }
                </span>

                <h3 className="mt-3 text-lg font-bold leading-6 text-slate-900">
                  {
                    selectedEvent.title
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedEvent(
                    null
                  )
                }
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>


            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Applicant
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {
                    selectedEvent.applicantName
                  }
                </p>
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 p-3">
                  <Clock3 className="h-4 w-4 text-blue-500" />

                  <p className="mt-2 text-[9px] font-bold uppercase text-slate-400">
                    Start
                  </p>

                  <p className="mt-1 text-[10px] font-semibold text-slate-700">
                    {
                      formatDateTime(
                        selectedEvent.start
                      )
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 p-3">
                  <Clock3 className="h-4 w-4 text-slate-400" />

                  <p className="mt-2 text-[9px] font-bold uppercase text-slate-400">
                    End
                  </p>

                  <p className="mt-1 text-[10px] font-semibold text-slate-700">
                    {
                      formatDateTime(
                        selectedEvent.end
                      )
                    }
                  </p>
                </div>
              </div>


              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Status
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {
                    selectedEvent.status
                  }
                </p>
              </div>


              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Owner
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-400" />

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {
                        selectedEvent.owner
                          ?.name ||
                        "—"
                      }
                    </p>

                    <p className="text-[9px] text-slate-400">
                      {
                        selectedEvent.owner
                          ?.email ||
                        selectedEvent.owner
                          ?.role ||
                        ""
                      }
                    </p>
                  </div>
                </div>
              </div>


              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Calendar Sync
                </p>

                <span
                  className={
                    `mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${syncClass(
                      selectedEvent.calendarSyncStatus
                    )}`
                  }
                >
                  {
                    selectedEvent.calendarSyncStatus
                  }
                </span>
              </div>


              {selectedEvent.location && (
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Location
                  </p>

                  <p className="mt-1 text-xs text-slate-700">
                    {
                      selectedEvent.location
                    }
                  </p>
                </div>
              )}


              {selectedEvent.description && (
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Details
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                    {
                      selectedEvent.description
                    }
                  </p>
                </div>
              )}
            </div>


            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={
                  openingApplicant
                }
                onClick={() =>
                  void openApplicant(
                    selectedEvent.applicantId
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {openingApplicant ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}

                Open Applicant
              </button>

              {isSafeExternalUrl(
                selectedEvent.eventUrl
              ) && (
                <a
                  href={
                    selectedEvent.eventUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />

                  Open Meeting / Calendar
                </a>
              )}
            </div>


            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-[9px] leading-4 text-blue-700">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
              Calendar workspace is read-only. External Calendar changes remain explicit actions inside the Applicant Notes / Tasks or Interview workflow.
            </div>
          </div>
        </div>
      )}


      {selectedApplicant && (
        <ApplicantProfilePanel
          applicant={
            selectedApplicant
          }

          pipeline={
            pipeline
          }

          onClose={() =>
            setSelectedApplicant(
              null
            )
          }

          onChanged={
            refreshSelectedApplicant
          }
        />
      )}
    </div>
  );
}
