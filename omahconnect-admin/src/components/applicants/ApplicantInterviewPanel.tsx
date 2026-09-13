import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Plus,
  RotateCcw,
  UserRound,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";

import {
  archiveApplicantInterview,
  cancelApplicantInterview,
  checkApplicantInterviewAvailability,
  completeApplicantInterview,
  createApplicantInterview,
  fetchApplicantInterviews,
  markApplicantInterviewNoShow,
  updateApplicantInterview,
  type ApplicantFormSubmission,
  type ApplicantInterview,
  type ApplicantInterviewAvailability,
  type ApplicantInterviewCompletePayload,
  type ApplicantInterviewFormat,
  type ApplicantInterviewOutcome,
  type ApplicantInterviewParticipant,
  type ApplicantInterviewType,
  type ApplicantMaster,
} from "../../services/api";


interface ApplicantInterviewPanelProps {
  applicant:
    ApplicantMaster;

  submissions:
    ApplicantFormSubmission[];
}


type ScheduleMode =
  | "create"
  | "edit";


interface ScheduleForm {
  submissionId: string;

  type:
    ApplicantInterviewType;

  format:
    ApplicantInterviewFormat;

  scheduledStart: string;
  scheduledEnd: string;

  timezone: string;

  meetingLink: string;
  location: string;

  notes: string;

  participants:
    ApplicantInterviewParticipant[];
}


interface AvailabilitySnapshot {
  signature: string;

  result:
    ApplicantInterviewAvailability;
}


interface CompleteForm {
  outcome:
    ApplicantInterviewOutcome;

  feedback: string;
  notes: string;
}


const INTERVIEW_TYPES: Array<{
  value:
    ApplicantInterviewType;
  label: string;
}> = [
  {
    value: "screening",
    label: "Screening",
  },
  {
    value: "hr",
    label: "HR",
  },
  {
    value: "technical",
    label: "Technical",
  },
  {
    value: "behavioral",
    label: "Behavioral",
  },
  {
    value: "managerial",
    label: "Managerial",
  },
  {
    value: "final",
    label: "Final",
  },
  {
    value: "other",
    label: "Other",
  },
];


const INTERVIEW_FORMATS: Array<{
  value:
    ApplicantInterviewFormat;
  label: string;
}> = [
  {
    value: "online",
    label: "Online",
  },
  {
    value: "onsite",
    label: "On-site",
  },
  {
    value: "phone",
    label: "Phone",
  },
];


const OUTCOMES: Array<{
  value:
    ApplicantInterviewOutcome;
  label: string;
}> = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "recommended",
    label: "Recommended",
  },
  {
    value:
      "not_recommended",
    label:
      "Not Recommended",
  },
  {
    value: "on_hold",
    label: "On Hold",
  },
];


function defaultTimezone() {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
      "UTC"
    );
  } catch {
    return "UTC";
  }
}


function toLocalInput(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const local =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() *
          60000
    );

  return local
    .toISOString()
    .slice(0, 16);
}


function toIso(
  value: string
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      "Please enter a valid interview date and time."
    );
  }

  return date.toISOString();
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

  return date.toLocaleString();
}


function formatDuration(
  start: string,
  end: string
) {
  const startDate =
    new Date(start);

  const endDate =
    new Date(end);

  const minutes =
    Math.round(
      (
        endDate.getTime() -
        startDate.getTime()
      ) /
        60000
    );

  if (
    !Number.isFinite(
      minutes
    ) ||
    minutes <= 0
  ) {
    return "";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainder =
    minutes % 60;

  return remainder
    ? `${hours}h ${remainder}m`
    : `${hours}h`;
}


function interviewErrorMessage(
  error: unknown
) {
  if (
    typeof error === "object" &&
    error !== null &&
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
      response?.data?.error
    ) {
      return response.data.error;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return (
    "Interview operation failed."
  );
}


function safeHttpUrl(
  value: string
) {
  if (!value.trim()) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol ===
        "https:" ||
      (
        url.protocol ===
          "http:" &&
        (
          url.hostname ===
            "localhost" ||
          url.hostname ===
            "127.0.0.1"
        )
      )
    );
  } catch {
    return false;
  }
}


function statusLabel(
  interview:
    ApplicantInterview
) {
  switch (
    interview.status
  ) {
    case "scheduled":
      return "Scheduled";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "no_show":
      return "No-show";
  }
}


function outcomeLabel(
  outcome:
    ApplicantInterviewOutcome
) {
  switch (outcome) {
    case "recommended":
      return "Recommended";

    case "not_recommended":
      return "Not Recommended";

    case "on_hold":
      return "On Hold";

    default:
      return "Pending";
  }
}


function statusClasses(
  status:
    ApplicantInterview["status"]
) {
  switch (status) {
    case "scheduled":
      return (
        "bg-blue-50 text-blue-700"
      );

    case "completed":
      return (
        "bg-emerald-50 text-emerald-700"
      );

    case "cancelled":
      return (
        "bg-rose-50 text-rose-700"
      );

    case "no_show":
      return (
        "bg-amber-50 text-amber-700"
      );
  }
}


function emptyScheduleForm():
  ScheduleForm {
  return {
    submissionId: "",

    type:
      "screening",

    format:
      "online",

    scheduledStart: "",

    scheduledEnd: "",

    timezone:
      defaultTimezone(),

    meetingLink: "",

    location: "",

    notes: "",

    participants: [
      {
        name: "",
        email: "",
        role:
          "Interviewer",
      },
    ],
  };
}


function availabilitySignature(
  form: ScheduleForm,
  interviewId = ""
) {
  return JSON.stringify({
    scheduledStart:
      form.scheduledStart,

    scheduledEnd:
      form.scheduledEnd,

    timezone:
      form.timezone,

    interviewId,

    participants:
      form.participants.map(
        (participant) => ({
          userId:
            participant.userId ||
            "",

          email:
            participant.email ||
            "",

          participantType:
            participant
              .participantType ||
            "interviewer",
        })
      ),
  });
}


function participantLabel(
  participant:
    ApplicantInterviewParticipant
) {
  return (
    participant.name ||
    participant.email ||
    participant.userId ||
    "Participant"
  );
}


export function ApplicantInterviewPanel({
  applicant,
  submissions,
}: ApplicantInterviewPanelProps) {
  const [
    interviews,
    setInterviews,
  ] = useState<
    ApplicantInterview[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    scheduleMode,
    setScheduleMode,
  ] = useState<
    ScheduleMode | null
  >(null);

  const [
    editingInterview,
    setEditingInterview,
  ] = useState<
    ApplicantInterview | null
  >(null);

  const [
    scheduleForm,
    setScheduleForm,
  ] = useState<ScheduleForm>(
    emptyScheduleForm()
  );


  const [
    availabilitySnapshot,
    setAvailabilitySnapshot,
  ] = useState<
    AvailabilitySnapshot | null
  >(null);


  const [
    checkingAvailability,
    setCheckingAvailability,
  ] = useState(false);

  const [
    completingInterview,
    setCompletingInterview,
  ] = useState<
    ApplicantInterview | null
  >(null);

  const [
    completeForm,
    setCompleteForm,
  ] = useState<CompleteForm>({
    outcome:
      "recommended",

    feedback: "",
    notes: "",
  });


  const loadInterviews =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const result =
            await fetchApplicantInterviews(
              applicant._id
            );

          setInterviews(
            result
          );
        } catch (loadError) {
          setError(
            interviewErrorMessage(
              loadError
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [applicant._id]
    );


  useEffect(
    () => {
      const timerId =
        window.setTimeout(
          () => {
            void loadInterviews();
          },
          0
        );

      return () => {
        window.clearTimeout(
          timerId
        );
      };
    },
    [loadInterviews]
  );


  const upcoming =
    useMemo(
      () =>
        interviews
          .filter(
            (interview) =>
              interview.status ===
                "scheduled"
          )
          .sort(
            (left, right) =>
              new Date(
                left.scheduledStart
              ).getTime() -
              new Date(
                right.scheduledStart
              ).getTime()
          ),
      [interviews]
    );


  const history =
    useMemo(
      () =>
        interviews
          .filter(
            (interview) =>
              interview.status !==
                "scheduled"
          )
          .sort(
            (left, right) =>
              new Date(
                right.scheduledStart
              ).getTime() -
              new Date(
                left.scheduledStart
              ).getTime()
          ),
      [interviews]
    );


  function openCreate() {
    setEditingInterview(
      null
    );

    setScheduleForm(
      emptyScheduleForm()
    );

    setAvailabilitySnapshot(
      null
    );

    setScheduleMode(
      "create"
    );
  }


  function openEdit(
    interview:
      ApplicantInterview
  ) {
    setEditingInterview(
      interview
    );

    setAvailabilitySnapshot(
      null
    );

    setScheduleForm({
      submissionId:
        interview.submissionId ||
        "",

      type:
        interview.type,

      format:
        interview.format,

      scheduledStart:
        toLocalInput(
          interview.scheduledStart
        ),

      scheduledEnd:
        toLocalInput(
          interview.scheduledEnd
        ),

      timezone:
        interview.timezone ||
        defaultTimezone(),

      meetingLink:
        interview.meetingLink ||
        "",

      location:
        interview.location ||
        "",

      notes:
        interview.notes ||
        "",

      participants:
        interview.participants
          .length > 0
          ? interview
              .participants
              .map(
                (
                  participant
                ) => ({
                  ...participant,
                })
              )
          : [
              {
                name: "",
                email: "",
                role:
                  "Interviewer",
              },
            ],
    });

    setScheduleMode(
      "edit"
    );
  }


  function closeSchedule() {
    if (busy) {
      return;
    }

    setScheduleMode(null);

    setEditingInterview(
      null
    );

    setAvailabilitySnapshot(
      null
    );
  }


  function updateParticipant(
    index: number,
    key:
      | "name"
      | "email"
      | "role",
    value: string
  ) {
    setScheduleForm(
      (previous) => ({
        ...previous,

        participants:
          previous
            .participants
            .map(
              (
                participant,
                participantIndex
              ) =>
                participantIndex ===
                index
                  ? {
                      ...participant,
                      [key]:
                        value,
                    }
                  : participant
            ),
      })
    );
  }


  function addParticipant() {
    setScheduleForm(
      (previous) => ({
        ...previous,

        participants: [
          ...previous.participants,

          {
            name: "",
            email: "",
            role:
              "Interviewer",
          },
        ],
      })
    );
  }


  function removeParticipant(
    index: number
  ) {
    setScheduleForm(
      (previous) => ({
        ...previous,

        participants:
          previous
            .participants
            .filter(
              (
                _,
                participantIndex
              ) =>
                participantIndex !==
                index
            ),
      })
    );
  }


  function normalizedScheduleParticipants():
    ApplicantInterviewParticipant[] {
    return scheduleForm
      .participants
      .map(
        (
          participant
        ) => ({
          userId:
            participant
              .userId
              ?.trim() ||
            "",

          name:
            participant
              .name
              .trim(),

          email:
            participant
              .email
              ?.trim() ||
            "",

          participantType:
            participant
              .participantType ||
            "interviewer",

          role:
            participant
              .role
              ?.trim() ||
            "",
        })
      )
      .filter(
        (participant) =>
          Boolean(
            participant.name ||
            participant.email ||
            participant.userId
          )
      );
  }


  async function checkScheduleAvailability() {
    const participants =
      normalizedScheduleParticipants();

    if (
      participants.length === 0
    ) {
      window.alert(
        "Add at least one interview participant."
      );

      return null;
    }

    if (
      !scheduleForm
        .scheduledStart ||
      !scheduleForm
        .scheduledEnd
    ) {
      window.alert(
        "Select the interview start and end time."
      );

      return null;
    }

    let start: string;
    let end: string;

    try {
      start =
        toIso(
          scheduleForm
            .scheduledStart
        );

      end =
        toIso(
          scheduleForm
            .scheduledEnd
        );
    } catch (
      dateError
    ) {
      window.alert(
        interviewErrorMessage(
          dateError
        )
      );

      return null;
    }

    if (
      new Date(end).getTime() <=
      new Date(start).getTime()
    ) {
      window.alert(
        "Interview end time must be after the start time."
      );

      return null;
    }

    const signature =
      availabilitySignature(
        scheduleForm,

        scheduleMode ===
            "edit" &&
          editingInterview
          ? editingInterview._id
          : ""
      );

    setCheckingAvailability(
      true
    );

    try {
      const result =
        await checkApplicantInterviewAvailability(
          applicant._id,

          {
            scheduledStart:
              start,

            scheduledEnd:
              end,

            timezone:
              scheduleForm
                .timezone,

            participants,

            excludeInterviewId:
              scheduleMode ===
                  "edit" &&
                editingInterview
                ? editingInterview
                    ._id
                : null,
          }
        );

      setAvailabilitySnapshot({
        signature,
        result,
      });

      return result;
    } catch (
      availabilityError
    ) {
      window.alert(
        interviewErrorMessage(
          availabilityError
        )
      );

      return null;
    } finally {
      setCheckingAvailability(
        false
      );
    }
  }


  async function saveSchedule() {
    const participants =
      normalizedScheduleParticipants();


    if (
      participants.length === 0
    ) {
      window.alert(
        "Add at least one interview participant."
      );

      return;
    }

    if (
      !scheduleForm
        .scheduledStart ||
      !scheduleForm
        .scheduledEnd
    ) {
      window.alert(
        "Select the interview start and end time."
      );

      return;
    }

    let start: string;
    let end: string;

    try {
      start =
        toIso(
          scheduleForm
            .scheduledStart
        );

      end =
        toIso(
          scheduleForm
            .scheduledEnd
        );
    } catch (
      dateError
    ) {
      window.alert(
        interviewErrorMessage(
          dateError
        )
      );

      return;
    }

    if (
      new Date(end).getTime() <=
      new Date(start).getTime()
    ) {
      window.alert(
        "Interview end time must be after the start time."
      );

      return;
    }

    const availabilityResult =
      await checkScheduleAvailability();

    if (
      !availabilityResult
    ) {
      return;
    }

    if (
      !availabilityResult
        .available
    ) {
      window.alert(
        "This interview time is unavailable. Choose another time before scheduling."
      );

      return;
    }


    setBusy(true);

    try {
      if (
        scheduleMode ===
          "edit" &&
        editingInterview
      ) {
        await updateApplicantInterview(
          applicant._id,

          editingInterview._id,

          {
            type:
              scheduleForm.type,

            format:
              scheduleForm.format,

            scheduledStart:
              start,

            scheduledEnd:
              end,

            timezone:
              scheduleForm
                .timezone,

            meetingLink:
              scheduleForm
                .meetingLink,

            location:
              scheduleForm
                .location,

            participants,

            notes:
              scheduleForm.notes,
          }
        );
      } else {
        await createApplicantInterview(
          applicant._id,

          {
            submissionId:
              scheduleForm
                .submissionId ||
              null,

            type:
              scheduleForm.type,

            format:
              scheduleForm.format,

            scheduledStart:
              start,

            scheduledEnd:
              end,

            timezone:
              scheduleForm
                .timezone,

            meetingLink:
              scheduleForm
                .meetingLink,

            location:
              scheduleForm
                .location,

            participants,

            notes:
              scheduleForm.notes,
          }
        );
      }

      setScheduleMode(null);

      setEditingInterview(
        null
      );

      await loadInterviews();
    } catch (
      saveError
    ) {
      window.alert(
        interviewErrorMessage(
          saveError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  function openComplete(
    interview:
      ApplicantInterview
  ) {
    setCompletingInterview(
      interview
    );

    setCompleteForm({
      outcome:
        "recommended",

      feedback:
        interview.feedback ||
        "",

      notes:
        interview.notes ||
        "",
    });
  }


  async function saveCompletion() {
    if (
      !completingInterview
    ) {
      return;
    }

    setBusy(true);

    try {
      const payload:
        ApplicantInterviewCompletePayload =
        {
          outcome:
            completeForm.outcome,

          feedback:
            completeForm
              .feedback,

          notes:
            completeForm.notes,
        };

      await completeApplicantInterview(
        applicant._id,

        completingInterview._id,

        payload
      );

      setCompletingInterview(
        null
      );

      await loadInterviews();
    } catch (
      completeError
    ) {
      window.alert(
        interviewErrorMessage(
          completeError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function cancelInterview(
    interview:
      ApplicantInterview
  ) {
    const reason =
      window.prompt(
        "Cancellation reason:",
        ""
      );

    if (reason === null) {
      return;
    }

    if (
      !window.confirm(
        "Cancel this interview?"
      )
    ) {
      return;
    }

    try {
      await cancelApplicantInterview(
        applicant._id,
        interview._id,
        reason
      );

      await loadInterviews();
    } catch (
      cancelError
    ) {
      window.alert(
        interviewErrorMessage(
          cancelError
        )
      );
    }
  }


  async function noShow(
    interview:
      ApplicantInterview
  ) {
    if (
      !window.confirm(
        "Mark this Applicant as a no-show for this interview?"
      )
    ) {
      return;
    }

    const notes =
      window.prompt(
        "Optional no-show notes:",
        ""
      ) ?? "";

    try {
      await markApplicantInterviewNoShow(
        applicant._id,
        interview._id,
        notes
      );

      await loadInterviews();
    } catch (
      noShowError
    ) {
      window.alert(
        interviewErrorMessage(
          noShowError
        )
      );
    }
  }


  async function archiveInterview(
    interview:
      ApplicantInterview
  ) {
    if (
      !window.confirm(
        "Archive this interview? The record will remain preserved."
      )
    ) {
      return;
    }

    const reason =
      window.prompt(
        "Optional archive reason:",
        ""
      ) ?? "";

    try {
      await archiveApplicantInterview(
        applicant._id,
        interview._id,
        reason
      );

      await loadInterviews();
    } catch (
      archiveError
    ) {
      window.alert(
        interviewErrorMessage(
          archiveError
        )
      );
    }
  }


  function InterviewCard({
    interview,
  }: {
    interview:
      ApplicantInterview;
  }) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold capitalize text-slate-900">
                {
                  INTERVIEW_TYPES.find(
                    (item) =>
                      item.value ===
                      interview.type
                  )?.label ||
                  interview.type
                }{" "}
                Interview
              </h4>

              <span
                className={
                  `rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClasses(
                    interview.status
                  )}`
                }
              >
                {
                  statusLabel(
                    interview
                  )
                }
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />

                {
                  formatDateTime(
                    interview
                      .scheduledStart
                  )
                }
              </span>

              <span className="flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />

                {
                  formatDuration(
                    interview
                      .scheduledStart,
                    interview
                      .scheduledEnd
                  )
                }
              </span>

              <span className="flex items-center gap-1 capitalize">
                {
                  interview.format ===
                    "online"
                    ? (
                      <Video className="h-3.5 w-3.5" />
                    )
                    : (
                      <MapPin className="h-3.5 w-3.5" />
                    )
                }

                {
                  interview.format
                }
              </span>

              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />

                {
                  interview
                    .participants
                    .length
                }{" "}
                participant
                {
                  interview
                    .participants
                    .length === 1
                    ? ""
                    : "s"
                }
              </span>
            </div>
          </div>

          {
            interview.status ===
              "completed" && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                {
                  outcomeLabel(
                    interview.outcome
                  )
                }
              </span>
            )
          }
        </div>


        {
          interview.participants
            .length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {
                interview.participants
                  .map(
                    (
                      participant,
                      index
                    ) => (
                      <span
                        key={
                          `${interview._id}-participant-${index}`
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600"
                      >
                        <UserRound className="h-3 w-3" />

                        {
                          participantLabel(
                            participant
                          )
                        }

                        {
                          participant.role
                            ? ` · ${participant.role}`
                            : ""
                        }
                      </span>
                    )
                  )
              }
            </div>
          )
        }


        {
          interview.meetingLink &&
          safeHttpUrl(
            interview.meetingLink
          ) && (
            <a
              href={
                interview.meetingLink
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Join / Open Meeting

              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )
        }


        {
          interview.location && (
            <p className="mt-3 text-xs text-slate-600">
              <strong>
                Location:
              </strong>{" "}
              {
                interview.location
              }
            </p>
          )
        }


        {
          interview.notes && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              {
                interview.notes
              }
            </p>
          )
        }


        {
          interview.status ===
            "completed" &&
          interview.feedback && (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Interview Feedback
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                {
                  interview.feedback
                }
              </p>
            </div>
          )
        }


        {
          interview.status ===
            "cancelled" &&
          interview
            .cancellationReason && (
            <p className="mt-3 text-xs text-rose-600">
              <strong>
                Cancellation:
              </strong>{" "}
              {
                interview
                  .cancellationReason
              }
            </p>
          )
        }


        <div className="mt-4 flex flex-wrap gap-2">
          {
            interview.status ===
              "scheduled" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    openEdit(
                      interview
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                  Reschedule / Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openComplete(
                      interview
                    )
                  }
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                  Complete
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void noShow(
                      interview
                    )
                  }
                  className="rounded-lg border border-amber-200 px-3 py-2 text-[11px] font-bold text-amber-700 hover:bg-amber-50"
                >
                  No-show
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void cancelInterview(
                      interview
                    )
                  }
                  className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="mr-1 inline h-3.5 w-3.5" />
                  Cancel
                </button>
              </>
            )
          }

          <button
            type="button"
            onClick={() =>
              void archiveInterview(
                interview
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
          >
            <Archive className="mr-1 inline h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      </article>
    );
  }


  const currentAvailability =
    availabilitySnapshot &&
    availabilitySnapshot
      .signature ===
      availabilitySignature(
        scheduleForm,

        scheduleMode ===
            "edit" &&
          editingInterview
          ? editingInterview._id
          : ""
      )
      ? availabilitySnapshot
          .result
      : null;


  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Interview Management
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Schedule, reschedule and record interview outcomes without altering the Applicant recruitment status automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Schedule Interview
        </button>
      </div>


      {
        error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )
      }


      {
        loading ? (
          <div className="rounded-xl border border-slate-100 bg-white p-6 text-center text-xs text-slate-400">
            Loading interviews...
          </div>
        ) : (
          <>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Upcoming Interviews
                </h4>

                <span className="text-[10px] text-slate-400">
                  {
                    upcoming.length
                  }{" "}
                  scheduled
                </span>
              </div>

              {
                upcoming.length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-7 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      No interviews scheduled
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Schedule the Applicant's next interview when ready.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {
                      upcoming.map(
                        (
                          interview
                        ) => (
                          <InterviewCard
                            key={
                              interview._id
                            }
                            interview={
                              interview
                            }
                          />
                        )
                      )
                    }
                  </div>
                )
              }
            </section>


            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Interview History
                </h4>

                <span className="text-[10px] text-slate-400">
                  {
                    history.length
                  }{" "}
                  record
                  {
                    history.length ===
                      1
                      ? ""
                      : "s"
                  }
                </span>
              </div>

              {
                history.length ===
                  0 ? (
                  <div className="rounded-xl border border-slate-100 bg-white p-5 text-center text-xs text-slate-400">
                    No completed, cancelled or no-show interviews yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {
                      history.map(
                        (
                          interview
                        ) => (
                          <InterviewCard
                            key={
                              interview._id
                            }
                            interview={
                              interview
                            }
                          />
                        )
                      )
                    }
                  </div>
                )
              }
            </section>
          </>
        )
      }


      {
        scheduleMode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {
                      scheduleMode ===
                        "create"
                        ? "Schedule Interview"
                        : "Reschedule / Edit Interview"
                    }
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    {
                      applicant
                        .identity
                        .fullName
                    }
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    busy ||
                    checkingAvailability
                  }
                  onClick={() =>
                    void checkScheduleAvailability()
                  }
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 disabled:opacity-50"
                >
                  {
                    checkingAvailability
                      ? "Checking..."
                      : "Check Availability"
                  }
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={
                    closeSchedule
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>


              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {
                  scheduleMode ===
                    "create" && (
                    <label className="sm:col-span-2">
                      <span className="text-xs font-bold text-slate-700">
                        Related Submission
                      </span>

                      <select
                        value={
                          scheduleForm
                            .submissionId
                        }
                        onChange={(
                          event
                        ) =>
                          setScheduleForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              submissionId:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">
                          None — Applicant level interview
                        </option>

                        {
                          submissions.map(
                            (
                              submission,
                              index
                            ) => (
                              <option
                                key={
                                  submission._id
                                }
                                value={
                                  submission._id
                                }
                              >
                                Submission{" "}
                                {
                                  index +
                                  1
                                }
                                {
                                  submission
                                    .submittedAt
                                    ? ` — ${new Date(
                                        submission.submittedAt
                                      ).toLocaleDateString()}`
                                    : ""
                                }
                              </option>
                            )
                          )
                        }
                      </select>
                    </label>
                  )
                }


                <label>
                  <span className="text-xs font-bold text-slate-700">
                    Interview Type
                  </span>

                  <select
                    value={
                      scheduleForm.type
                    }
                    onChange={(
                      event
                    ) =>
                      setScheduleForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          type:
                            event
                              .target
                              .value as ApplicantInterviewType,
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {
                      INTERVIEW_TYPES.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </option>
                        )
                      )
                    }
                  </select>
                </label>


                <label>
                  <span className="text-xs font-bold text-slate-700">
                    Format
                  </span>

                  <select
                    value={
                      scheduleForm
                        .format
                    }
                    onChange={(
                      event
                    ) =>
                      setScheduleForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          format:
                            event
                              .target
                              .value as ApplicantInterviewFormat,
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {
                      INTERVIEW_FORMATS.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </option>
                        )
                      )
                    }
                  </select>
                </label>


                <label>
                  <span className="text-xs font-bold text-slate-700">
                    Start
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      scheduleForm
                        .scheduledStart
                    }
                    onChange={(
                      event
                    ) =>
                      setScheduleForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          scheduledStart:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>


                <label>
                  <span className="text-xs font-bold text-slate-700">
                    End
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      scheduleForm
                        .scheduledEnd
                    }
                    onChange={(
                      event
                    ) =>
                      setScheduleForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          scheduledEnd:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>


                <label className="sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700">
                    Timezone
                  </span>

                  <input
                    type="text"
                    value={
                      scheduleForm
                        .timezone
                    }
                    onChange={(
                      event
                    ) =>
                      setScheduleForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          timezone:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Asia/Beirut"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>


                {
                  scheduleForm
                    .format ===
                    "online" && (
                    <label className="sm:col-span-2">
                      <span className="text-xs font-bold text-slate-700">
                        Meeting Link
                      </span>

                      <input
                        type="url"
                        value={
                          scheduleForm
                            .meetingLink
                        }
                        onChange={(
                          event
                        ) =>
                          setScheduleForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              meetingLink:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="https://..."
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  )
                }


                {
                  scheduleForm
                    .format ===
                    "onsite" && (
                    <label className="sm:col-span-2">
                      <span className="text-xs font-bold text-slate-700">
                        Location
                      </span>

                      <input
                        type="text"
                        value={
                          scheduleForm
                            .location
                        }
                        onChange={(
                          event
                        ) =>
                          setScheduleForm(
                            (
                              previous
                            ) => ({
                              ...previous,

                              location:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                        placeholder="Office / meeting room"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  )
                }


                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Participants
                    </span>

                    <button
                      type="button"
                      onClick={
                        addParticipant
                      }
                      className="text-[11px] font-bold text-blue-600"
                    >
                      + Add participant
                    </button>
                  </div>

                  <div className="space-y-3">
                    {
                      scheduleForm
                        .participants
                        .map(
                          (
                            participant,
                            index
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                            >
                              <input
                                type="text"
                                value={
                                  participant.name
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateParticipant(
                                    index,
                                    "name",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Name"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              />

                              <input
                                type="email"
                                value={
                                  participant.email ||
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateParticipant(
                                    index,
                                    "email",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Email"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              />

                              <input
                                type="text"
                                value={
                                  participant.role ||
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateParticipant(
                                    index,
                                    "role",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Role"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              />

                              <button
                                type="button"
                                disabled={
                                  scheduleForm
                                    .participants
                                    .length ===
                                  1
                                }
                                onClick={() =>
                                  removeParticipant(
                                    index
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-500 disabled:opacity-30"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        )
                    }
                  </div>
                </div>


                <label className="sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700">
                    Notes
                  </span>

                  <textarea
                    rows={4}
                    value={
                      scheduleForm.notes
                    }
                    onChange={(
                      event
                    ) =>
                      setScheduleForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          notes:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>


              {
                currentAvailability && (
                  <div className="mx-6 mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      {
                        currentAvailability
                          .status ===
                          "busy" ? (
                          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                        )
                      }

                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {
                            currentAvailability
                              .status ===
                              "busy"
                              ? "Time unavailable"
                              : currentAvailability
                                    .fullyChecked
                                ? "Time available"
                                : "OMAH availability clear"
                          }
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          {
                            currentAvailability
                              .status ===
                              "busy"
                              ? "One or more organizer/interviewer conflicts were found."
                              : currentAvailability
                                    .fullyChecked
                                ? "No OMAH or Google Calendar conflicts were found."
                                : "No conflicting OMAH interview was found. Google Calendar has not been fully checked yet."
                          }
                        </p>

                        {
                          currentAvailability
                            .local
                            .conflicts
                            .length > 0 && (
                            <p className="mt-2 text-[11px] font-semibold text-rose-600">
                              {
                                currentAvailability
                                  .local
                                  .conflicts
                                  .length
                              }{" "}
                              OMAH interview conflict
                              {
                                currentAvailability
                                  .local
                                  .conflicts
                                  .length ===
                                  1
                                  ? ""
                                  : "s"
                              }
                            </p>
                          )
                        }

                        {
                          currentAvailability
                            .google
                            .busy
                            .length > 0 && (
                            <p className="mt-1 text-[11px] font-semibold text-rose-600">
                              {
                                currentAvailability
                                  .google
                                  .busy
                                  .length
                              }{" "}
                              Google Calendar busy interval
                              {
                                currentAvailability
                                  .google
                                  .busy
                                  .length ===
                                  1
                                  ? ""
                                  : "s"
                              }
                            </p>
                          )
                        }
                      </div>
                    </div>
                  </div>
                )
              }


              <footer className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={
                    closeSchedule
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    checkingAvailability
                  }
                  onClick={() =>
                    void saveSchedule()
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {
                    busy
                      ? "Saving..."
                      : scheduleMode ===
                          "create"
                        ? "Schedule Interview"
                        : "Save Changes"
                  }
                </button>
              </footer>
            </div>
          </div>
        )
      }


      {
        completingInterview && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Complete Interview
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Record the interview outcome and feedback.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setCompletingInterview(
                      null
                    )
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>


              <div className="space-y-4 p-6">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">
                    Outcome
                  </span>

                  <select
                    value={
                      completeForm
                        .outcome
                    }
                    onChange={(
                      event
                    ) =>
                      setCompleteForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          outcome:
                            event
                              .target
                              .value as ApplicantInterviewOutcome,
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {
                      OUTCOMES.map(
                        (
                          outcome
                        ) => (
                          <option
                            key={
                              outcome.value
                            }
                            value={
                              outcome.value
                            }
                          >
                            {
                              outcome.label
                            }
                          </option>
                        )
                      )
                    }
                  </select>
                </label>


                <label className="block">
                  <span className="text-xs font-bold text-slate-700">
                    Feedback
                  </span>

                  <textarea
                    rows={5}
                    value={
                      completeForm
                        .feedback
                    }
                    onChange={(
                      event
                    ) =>
                      setCompleteForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          feedback:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    placeholder="Strengths, concerns and overall interview feedback..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>


                <label className="block">
                  <span className="text-xs font-bold text-slate-700">
                    Internal Notes
                  </span>

                  <textarea
                    rows={3}
                    value={
                      completeForm
                        .notes
                    }
                    onChange={(
                      event
                    ) =>
                      setCompleteForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          notes:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>


              <footer className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setCompletingInterview(
                      null
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void saveCompletion()
                  }
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {
                    busy
                      ? "Saving..."
                      : "Complete Interview"
                  }
                </button>
              </footer>
            </div>
          </div>
        )
      }
    </section>
  );
}

