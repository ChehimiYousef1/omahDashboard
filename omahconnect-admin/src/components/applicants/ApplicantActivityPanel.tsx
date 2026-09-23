import {
  useEffect,
  useState,
} from "react";

import {
  Activity,
  Archive,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Mail,
  RefreshCw,
  UserRound,
} from "lucide-react";

import {
  fetchApplicantActivity,
  type ApplicantActivityEvent,
  type ApplicantMaster,
} from "../../services/api";


interface ApplicantActivityPanelProps {
  applicant:
    ApplicantMaster;
}


const FILTERS = [
  {
    id: "",
    label: "All",
  },
  {
    id: "submission",
    label: "Submissions",
  },
  {
    id: "evaluation",
    label: "Evaluations",
  },
  {
    id: "interview",
    label: "Interviews",
  },
  {
    id: "status",
    label: "Status",
  },
  {
    id: "communication",
    label: "Communications",
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
  },

  {
    id: "talent_pool",
    label: "Talent Pool",
  },];


function errorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error === "object" &&
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
      typeof response
        ?.data?.error ===
      "string"
    ) {
      return response.data.error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Unexpected error";
}


function eventIcon(
  category: string
) {
  switch (category) {
    case "submission":
      return FileText;

    case "evaluation":
      return ClipboardCheck;

    case "interview":
      return CalendarDays;

    case "communication":
      return Mail;

    case "lifecycle":
      return Archive;

    case "profile":
      return UserRound;

    case "status":
      return RefreshCw;

    default:
      return Activity;
  }
}


function actorLabel(
  event:
    ApplicantActivityEvent
) {
  const actor =
    event.actor;

  if (actor.name) {
    return actor.name;
  }

  if (actor.email) {
    return actor.email;
  }

  if (actor.userId) {
    return actor.userId;
  }

  return "";
}


function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}


function metadataText(
  event:
    ApplicantActivityEvent
) {
  const metadata =
    event.metadata || {};

  if (
    event.type ===
      "status.changed"
  ) {
    const previous =
      typeof metadata.previousStatus ===
        "string"
        ? metadata.previousStatus
        : "";

    const next =
      typeof metadata.nextStatus ===
        "string"
        ? metadata.nextStatus
        : "";

    if (
      previous ||
      next
    ) {
      return `${previous || "—"} → ${next || "—"}`;
    }
  }

  if (
    event.category ===
      "evaluation"
  ) {
    const recommendation =
      typeof metadata.recommendation ===
        "string"
        ? metadata.recommendation
        : "";

    const score =
      typeof metadata.weightedScore ===
        "number"
        ? metadata.weightedScore
        : null;

    if (
      recommendation &&
      score !== null
    ) {
      return `${recommendation} · ${score}/100`;
    }

    if (recommendation) {
      return recommendation;
    }
  }

  if (
    event.type ===
      "interview.scheduled"
  ) {
    const start =
      typeof metadata.scheduledStart ===
        "string"
        ? metadata.scheduledStart
        : "";

    if (start) {
      return `Scheduled for ${formatDate(
        start
      )}`;
    }
  }

  if (
    event.type ===
      "communication.email.sent"
  ) {
    const subject =
      typeof metadata.subject ===
        "string"
        ? metadata.subject
        : "";

    if (subject) {
      return `Subject: ${subject}`;
    }
  }

  if (
    event.type ===
      "communication.whatsapp.sent"
  ) {
    const provider =
      typeof metadata.provider ===
        "string"
        ? metadata.provider
        : "";

    if (provider) {
      return `Provider: ${provider}`;
    }
  }

  if (
    event.type ===
      "profile.updated"
  ) {
    const fields =
      Array.isArray(
        metadata.editedFields
      )
        ? metadata.editedFields
            .filter(
              (
                value
              ): value is string =>
                typeof value ===
                "string"
            )
        : [];

    if (
      fields.length >
        0
    ) {
      return `Updated: ${fields.join(
        ", "
      )}`;
    }
  }

  if (
    event.type ===
      "submission.created"
  ) {
    const source =
      typeof metadata.source ===
        "string"
        ? metadata.source
        : "";

    if (source) {
      return `Source: ${source}`;
    }
  }

  return "";
}


export function ApplicantActivityPanel({
  applicant,
}: ApplicantActivityPanelProps) {
  const [
    category,
    setCategory,
  ] = useState("");

  const [
    events,
    setEvents,
  ] = useState<
    ApplicantActivityEvent[]
  >([]);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    let active =
      true;

    async function loadActivity() {
      try {
        setLoading(
          true
        );

        setError(
          ""
        );

        const result =
          await fetchApplicantActivity(
            applicant._id,
            {
              category:
                category ||
                undefined,

              limit:
                500,
            }
          );

        if (!active) {
          return;
        }

        setEvents(
          result.events
        );

        setTotal(
          result.total
        );
      } catch (loadError) {
        if (active) {
          setEvents(
            []
          );

          setTotal(
            0
          );

          setError(
            errorMessage(
              loadError
            )
          );
        }
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    void loadActivity();

    return () => {
      active =
        false;
    };
  }, [
    applicant._id,
    category,
  ]);


  return (
    <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Applicant Activity
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Chronological history of recruitment activity for this Applicant.
          </p>
        </div>

        {!loading && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
            {total}{" "}
            {total === 1
              ? "event"
              : "events"}
          </span>
        )}
      </div>


      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map(
          (filter) => {
            const selected =
              category ===
              filter.id;

            return (
              <button
                key={
                  filter.id ||
                  "all"
                }
                type="button"
                onClick={() =>
                  setCategory(
                    filter.id
                  )
                }
                className={[
                  "rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors",

                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600",
                ].join(" ")}
              >
                {filter.label}
              </button>
            );
          }
        )}
      </div>


      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />

          Loading activity...
        </div>
      )}


      {!loading &&
        error && (
          <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-4 text-xs text-red-600">
            {error}
          </div>
        )}


      {!loading &&
        !error &&
        events.length ===
          0 && (
          <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-bold text-slate-700">
              No activity found
            </p>

            <p className="mt-1 text-xs text-slate-400">
              No events match the selected activity filter.
            </p>
          </div>
        )}


      {!loading &&
        !error &&
        events.length >
          0 && (
          <div className="mt-7">
            {events.map(
              (
                event,
                index
              ) => {
                const Icon =
                  eventIcon(
                    event.category
                  );

                const actor =
                  actorLabel(
                    event
                  );

                const details =
                  metadataText(
                    event
                  );

                const isLast =
                  index ===
                  events.length -
                    1;

                return (
                  <div
                    key={
                      event.id
                    }
                    className="relative flex gap-4"
                  >
                    <div className="relative flex w-9 shrink-0 justify-center">
                      {!isLast && (
                        <div className="absolute bottom-0 top-9 w-px bg-slate-200" />
                      )}

                      <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 pb-7">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {
                                event.title
                              }
                            </p>

                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {
                                event.category
                              }
                            </p>
                          </div>

                          <time className="text-[10px] text-slate-400">
                            {formatDate(
                              event.occurredAt
                            )}
                          </time>
                        </div>

                        {event.description && (
                          <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                            {
                              event.description
                            }
                          </p>
                        )}

                        {details && (
                          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-slate-600">
                            {
                              details
                            }
                          </p>
                        )}

                        {actor && (
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
                            <UserRound className="h-3.5 w-3.5" />

                            <span>
                              By{" "}
                              {
                                actor
                              }
                            </span>

                            {event.actor
                              .role && (
                              <span>
                                ·{" "}
                                {
                                  event
                                    .actor
                                    .role
                                }
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
    </section>
  );
}
