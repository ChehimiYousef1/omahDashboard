import {
  useEffect,
  useState,
} from "react";

import {
  Archive,
  Calendar,
  CheckCircle2,
  Flag,
  Heart,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Star,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import {
  addApplicantInternalNoteToCalendar,
  archiveApplicantInternalNote,
  archiveApplicantInternalNoteReply,
  createApplicantInternalNote,
  createApplicantInternalNoteReply,
  fetchApplicantInternalNoteReplies,
  fetchApplicantInternalNotes,
  fetchCurrentUser,
  fetchUsers,
  permanentlyDeleteApplicantInternalNote,
  permanentlyDeleteApplicantInternalNoteReply,
  removeApplicantInternalNoteFromCalendar,
  restoreApplicantInternalNote,
  restoreApplicantInternalNoteReply,
  setApplicantInternalNoteImportance,
  setApplicantInternalNoteLike,
  setApplicantInternalNoteStar,
  setApplicantInternalTaskAssignee,
  setApplicantInternalTaskPriority,
  setApplicantInternalTaskStatus,
  updateApplicantInternalNote,
  updateApplicantInternalNoteCalendar,
  updateApplicantInternalNoteReply,
  updateApplicantInternalNoteSchedule,
  updateApplicantTags,
  type ApplicantInternalNote,
  type ApplicantInternalNoteKind,
  type ApplicantInternalNoteReply,
  type ApplicantInternalNoteSchedule,
  type ApplicantInternalTaskPriority,
  type ApplicantInternalTaskStatus,
  type User,
} from "../../services/api";


const TAG_TAXONOMY = [
  "priority",
  "strong-candidate",
  "needs-review",
  "follow-up",
  "interview-ready",
  "missing-documents",
  "referral",
  "university-candidate",
  "hold",
  "do-not-contact",
];


const TASK_STATUS_OPTIONS:
Array<{
  value:
    ApplicantInternalTaskStatus;
  label:
    string;
}> = [
  {
    value:
      "todo",
    label:
      "To Do",
  },
  {
    value:
      "in_progress",
    label:
      "In Progress",
  },
  {
    value:
      "completed",
    label:
      "Completed",
  },
  {
    value:
      "cancelled",
    label:
      "Cancelled",
  },
];


const TASK_PRIORITY_OPTIONS:
Array<{
  value:
    ApplicantInternalTaskPriority;
  label:
    string;
}> = [
  {
    value:
      "",
    label:
      "Not set",
  },
  {
    value:
      "low",
    label:
      "Low",
  },
  {
    value:
      "medium",
    label:
      "Medium",
  },
  {
    value:
      "high",
    label:
      "High",
  },
  {
    value:
      "urgent",
    label:
      "Urgent",
  },
];


function taskStatusLabel(
  status?:
    ApplicantInternalTaskStatus
) {
  return (
    TASK_STATUS_OPTIONS.find(
      option =>
        option.value ===
        (status || "todo")
    )?.label ||
    "To Do"
  );
}


function taskPriorityLabel(
  priority?:
    ApplicantInternalTaskPriority
) {
  return (
    TASK_PRIORITY_OPTIONS.find(
      option =>
        option.value ===
        (priority || "")
    )?.label ||
    "Not set"
  );
}


type TaskViewFilter =
  | "all"
  | "all_tasks"
  | "mine"
  | "todo"
  | "in_progress"
  | "overdue"
  | "due_today"
  | "upcoming"
  | "completed"
  | "cancelled";


const TASK_VIEW_OPTIONS:
Array<{
  value:
    TaskViewFilter;
  label:
    string;
}> = [
  {
    value:
      "all",
    label:
      "All Items",
  },
  {
    value:
      "all_tasks",
    label:
      "All Tasks",
  },
  {
    value:
      "mine",
    label:
      "My Tasks",
  },
  {
    value:
      "todo",
    label:
      "To Do",
  },
  {
    value:
      "in_progress",
    label:
      "In Progress",
  },
  {
    value:
      "overdue",
    label:
      "Overdue",
  },
  {
    value:
      "due_today",
    label:
      "Due Today",
  },
  {
    value:
      "upcoming",
    label:
      "Upcoming",
  },
  {
    value:
      "completed",
    label:
      "Completed",
  },
  {
    value:
      "cancelled",
    label:
      "Cancelled",
  },
];


function internalTaskStatus(
  note:
    ApplicantInternalNote
): ApplicantInternalTaskStatus {
  return (
    note.taskStatus ||
    "todo"
  );
}


function internalTaskDueDate(
  note:
    ApplicantInternalNote
) {
  const raw =
    note.schedule
      ?.endAt;

  if (!raw) {
    return null;
  }

  const due =
    new Date(raw);

  return Number.isNaN(
    due.getTime()
  )
    ? null
    : due;
}


function localDayBounds(
  now:
    Date
) {
  const start =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const nextDay =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

  return {
    start,
    nextDay,
  };
}


function isActionableInternalTask(
  note:
    ApplicantInternalNote
) {
  if (
    note.kind !==
      "task" ||
    note.archived
  ) {
    return false;
  }

  const status =
    internalTaskStatus(
      note
    );

  return (
    status ===
      "todo" ||
    status ===
      "in_progress"
  );
}


function isInternalTaskOverdue(
  note:
    ApplicantInternalNote,

  now:
    Date
) {
  if (
    !isActionableInternalTask(
      note
    )
  ) {
    return false;
  }

  const due =
    internalTaskDueDate(
      note
    );

  return Boolean(
    due &&
    due.getTime() <
      now.getTime()
  );
}


function isInternalTaskDueToday(
  note:
    ApplicantInternalNote,

  now:
    Date
) {
  if (
    !isActionableInternalTask(
      note
    )
  ) {
    return false;
  }

  const due =
    internalTaskDueDate(
      note
    );

  if (!due) {
    return false;
  }

  const {
    start,
    nextDay,
  } =
    localDayBounds(
      now
    );

  return (
    due.getTime() >=
      start.getTime() &&
    due.getTime() <
      nextDay.getTime()
  );
}


function isInternalTaskUpcoming(
  note:
    ApplicantInternalNote,

  now:
    Date
) {
  if (
    !isActionableInternalTask(
      note
    )
  ) {
    return false;
  }

  const due =
    internalTaskDueDate(
      note
    );

  if (!due) {
    return false;
  }

  const {
    nextDay,
  } =
    localDayBounds(
      now
    );

  /*
   * Tomorrow through the following seven
   * local calendar days.
   */
  const windowEnd =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 8
    );

  return (
    due.getTime() >=
      nextDay.getTime() &&
    due.getTime() <
      windowEnd.getTime()
  );
}


function matchesTaskView(
  note:
    ApplicantInternalNote,

  filter:
    TaskViewFilter,

  currentUserId:
    string,

  now:
    Date
) {
  const kind =
    note.kind ===
      "task"
      ? "task"
      : "note";

  const status =
    internalTaskStatus(
      note
    );

  switch (filter) {
    case "all":
      return true;

    case "all_tasks":
      return (
        kind ===
        "task"
      );

    case "mine":
      return (
        kind ===
          "task" &&
        !note.archived &&
        Boolean(
          currentUserId
        ) &&
        note.assignee
          ?.userId ===
          currentUserId
      );

    case "todo":
      return (
        kind ===
          "task" &&
        !note.archived &&
        status ===
          "todo"
      );

    case "in_progress":
      return (
        kind ===
          "task" &&
        !note.archived &&
        status ===
          "in_progress"
      );

    case "overdue":
      return (
        isInternalTaskOverdue(
          note,
          now
        )
      );

    case "due_today":
      return (
        isInternalTaskDueToday(
          note,
          now
        )
      );

    case "upcoming":
      return (
        isInternalTaskUpcoming(
          note,
          now
        )
      );

    case "completed":
      return (
        kind ===
          "task" &&
        status ===
          "completed"
      );

    case "cancelled":
      return (
        kind ===
          "task" &&
        status ===
          "cancelled"
      );

    default:
      return true;
  }
}


interface Props {
  applicantId:
    string;

  initialTags:
    string[];

  archived:
    boolean;

  onChanged:
    () => Promise<void>;
}


interface ScheduleDraft {
  startAt: string;
  endAt: string;
  reminderAt: string;
  reminderNote: string;
}


function emptySchedule():
ScheduleDraft {
  return {
    startAt: "",
    endAt: "",
    reminderAt: "",
    reminderNote: "",
  };
}


function messageFromError(
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
      response?.data?.error
    ) {
      return response.data.error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to complete the request.";
}


function normalizeTagInput(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[\s_]+/g,
      "-"
    )
    .replace(
      /[^a-z0-9-]/g,
      ""
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}


function formatDateTime(
  value?:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? value
    : date.toLocaleString();
}


function toLocalDateTimeValue(
  value?:
    | string
    | null
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
        60_000
    );

  return local
    .toISOString()
    .slice(
      0,
      16
    );
}


function localDateTimeToIso(
  value: string
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}


function schedulePayload(
  draft:
    ScheduleDraft
): ApplicantInternalNoteSchedule {
  return {
    startAt:
      localDateTimeToIso(
        draft.startAt
      ),

    endAt:
      localDateTimeToIso(
        draft.endAt
      ),

    reminderAt:
      localDateTimeToIso(
        draft.reminderAt
      ),

    reminderNote:
      draft.reminderNote
        .trim(),
  };
}


function scheduleDraftFromNote(
  note:
    ApplicantInternalNote
): ScheduleDraft {
  return {
    startAt:
      toLocalDateTimeValue(
        note.schedule
          ?.startAt
      ),

    endAt:
      toLocalDateTimeValue(
        note.schedule
          ?.endAt
      ),

    reminderAt:
      toLocalDateTimeValue(
        note.schedule
          ?.reminderAt
      ),

    reminderNote:
      note.schedule
        ?.reminderNote ||
      "",
  };
}


function hasSchedule(
  note:
    ApplicantInternalNote
) {
  return Boolean(
    note.schedule
      ?.startAt ||
    note.schedule
      ?.endAt ||
    note.schedule
      ?.reminderAt ||
    note.schedule
      ?.reminderNote
  );
}


function browserTimeZone() {
  try {
    return (
      Intl
        .DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
      "UTC"
    );
  } catch {
    return "UTC";
  }
}


export function ApplicantInternalNotesTagsPanel({
  applicantId,
  initialTags,
  archived,
  onChanged,
}: Props) {
  const [
    notes,
    setNotes,
  ] =
    useState<
      ApplicantInternalNote[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");


  const [
    eligibleTaskAssignees,
    setEligibleTaskAssignees,
  ] =
    useState<User[]>([]);


  const [
    taskAssigneesLoading,
    setTaskAssigneesLoading,
  ] =
    useState(false);


  const [
    newPriority,
    setNewPriority,
  ] =
    useState<
      ApplicantInternalTaskPriority
    >("");


  const [
    newAssigneeUserId,
    setNewAssigneeUserId,
  ] =
    useState("");

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState("");

  const [
    showArchivedItems,
    setShowArchivedItems,
  ] =
    useState(false);


  const [
    taskViewFilter,
    setTaskViewFilter,
  ] =
    useState<
      TaskViewFilter
    >("all");


  /*
   * Create item
   */

  const [
    newContent,
    setNewContent,
  ] =
    useState("");

  const [
    newKind,
    setNewKind,
  ] =
    useState<
      ApplicantInternalNoteKind
    >("note");

  const [
    newImportant,
    setNewImportant,
  ] =
    useState(false);

  const [
    newSchedule,
    setNewSchedule,
  ] =
    useState<
      ScheduleDraft
    >(
      emptySchedule()
    );


  /*
   * Edit item
   */

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    editContent,
    setEditContent,
  ] =
    useState("");


  /*
   * Schedule editor
   */

  const [
    scheduleEditingId,
    setScheduleEditingId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    scheduleDraft,
    setScheduleDraft,
  ] =
    useState<
      ScheduleDraft
    >(
      emptySchedule()
    );


  /*
   * Replies
   */

  const [
    expandedRepliesId,
    setExpandedRepliesId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    repliesByNote,
    setRepliesByNote,
  ] =
    useState<
      Record<
        string,
        ApplicantInternalNoteReply[]
      >
    >({});

  const [
    repliesLoadingId,
    setRepliesLoadingId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    replyDraftByNote,
    setReplyDraftByNote,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    editingReplyId,
    setEditingReplyId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    editReplyContent,
    setEditReplyContent,
  ] =
    useState("");


  /*
   * Tags
   */

  const [
    tags,
    setTags,
  ] =
    useState<string[]>(
      initialTags ||
      []
    );

  const [
    tagInput,
    setTagInput,
  ] =
    useState("");

  const [
    tagsDirty,
    setTagsDirty,
  ] =
    useState(false);


  useEffect(
    () => {
      let cancelled =
        false;

      async function loadTaskAssignees() {
        try {
          setTaskAssigneesLoading(
            true
          );

          const users =
            await fetchUsers();

          if (cancelled) {
            return;
          }

          setEligibleTaskAssignees(
            users
              .filter(
                user =>
                  user.status ===
                    "Active" &&
                  [
                    "Recruiter",
                    "Admin",
                    "Super Admin",
                  ].includes(
                    user.role
                  )
              )
              .sort(
                (
                  left,
                  right
                ) =>
                  left.name.localeCompare(
                    right.name
                  )
              )
          );
        } catch {
          /*
           * Assignment remains optional.
           * The backend still validates every
           * non-empty assignee ID.
           */
          if (!cancelled) {
            setEligibleTaskAssignees(
              []
            );
          }
        } finally {
          if (!cancelled) {
            setTaskAssigneesLoading(
              false
            );
          }
        }
      }

      void loadTaskAssignees();

      return () => {
        cancelled =
          true;
      };
    },
    []
  );


  useEffect(
    () => {
      setTags(
        initialTags ||
        []
      );

      setTagsDirty(
        false
      );
    },
    [
      applicantId,
      initialTags,
    ]
  );


  useEffect(
    () => {
      let cancelled =
        false;

      async function loadUser() {
        try {
          const user =
            await fetchCurrentUser();

          if (!cancelled) {
            setCurrentUserId(
              String(
                user?.id ||
                ""
              )
            );
          }
        } catch {
          if (!cancelled) {
            setCurrentUserId("");
          }
        }
      }

      void loadUser();

      return () => {
        cancelled =
          true;
      };
    },
    []
  );


  useEffect(
    () => {
      let cancelled =
        false;

      async function load() {
        try {
          setLoading(true);
          setError("");

          const result =
            await fetchApplicantInternalNotes(
              applicantId,
              {
                includeArchived:
                  showArchivedItems,
              }
            );

          if (!cancelled) {
            setNotes(
              result
            );
          }
        } catch (
          loadError
        ) {
          if (!cancelled) {
            setError(
              messageFromError(
                loadError
              )
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      applicantId,
      showArchivedItems,
    ]
  );


  function replaceNote(
    updated:
      ApplicantInternalNote
  ) {
    setNotes(
      current =>
        current.map(
          item =>
            item._id ===
              updated._id
              ? updated
              : item
        )
    );
  }


  /*
   * Tags
   */

  function addTag(
    value:
      string
  ) {
    const normalized =
      normalizeTagInput(
        value
      );

    if (
      !normalized ||
      tags.includes(
        normalized
      ) ||
      tags.length >= 20
    ) {
      return;
    }

    setTags(
      current => [
        ...current,
        normalized,
      ]
    );

    setTagInput("");
    setTagsDirty(true);
  }


  function removeTag(
    value:
      string
  ) {
    setTags(
      current =>
        current.filter(
          item =>
            item !== value
        )
    );

    setTagsDirty(true);
  }


  async function saveTags() {
    try {
      setBusy(true);
      setError("");

      const result =
        await updateApplicantTags(
          applicantId,
          tags
        );

      setTags(
        result.tags
      );

      setTagsDirty(false);

      await onChanged();
    } catch (
      saveError
    ) {
      setError(
        messageFromError(
          saveError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  /*
   * Create note/task
   */

  async function createItem() {
    if (
      !newContent.trim()
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      const created =
        await createApplicantInternalNote(
          applicantId,
          newContent,
          {
            kind:
              newKind,

            important:
              newImportant,

            schedule:
              schedulePayload(
                newSchedule
              ),

            priority:
              newKind ===
                "task"
                ? newPriority
                : "",

            assigneeUserId:
              newKind ===
                "task"
                ? newAssigneeUserId
                : "",
          }
        );

      setNotes(
        current => [
          created,
          ...current,
        ]
      );

      setNewContent("");
      setNewKind("note");
      setNewImportant(false);
      setNewPriority("");
      setNewAssigneeUserId("");

      setNewSchedule(
        emptySchedule()
      );
    } catch (
      createError
    ) {
      setError(
        messageFromError(
          createError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  /*
   * Edit note/task
   */

  function beginEdit(
    note:
      ApplicantInternalNote
  ) {
    setEditingId(
      note._id
    );

    setEditContent(
      note.content
    );
  }


  async function saveEdit() {
    if (
      !editingId ||
      !editContent.trim()
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      const updated =
        await updateApplicantInternalNote(
          applicantId,
          editingId,
          editContent
        );

      replaceNote(
        updated
      );

      setEditingId(
        null
      );

      setEditContent("");
    } catch (
      updateError
    ) {
      setError(
        messageFromError(
          updateError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  /*
   * Item state
   */

  async function toggleLike(
    note:
      ApplicantInternalNote
  ) {
    if (!currentUserId) {
      return;
    }

    const liked =
      (
        note.likedBy ||
        []
      ).includes(
        currentUserId
      );

    try {
      setBusy(true);
      setError("");

      replaceNote(
        await setApplicantInternalNoteLike(
          applicantId,
          note._id,
          !liked
        )
      );
    } catch (
      actionError
    ) {
      setError(
        messageFromError(
          actionError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function toggleStar(
    note:
      ApplicantInternalNote
  ) {
    if (!currentUserId) {
      return;
    }

    const starred =
      (
        note.starredBy ||
        []
      ).includes(
        currentUserId
      );

    try {
      setBusy(true);
      setError("");

      replaceNote(
        await setApplicantInternalNoteStar(
          applicantId,
          note._id,
          !starred
        )
      );
    } catch (
      actionError
    ) {
      setError(
        messageFromError(
          actionError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function toggleImportant(
    note:
      ApplicantInternalNote
  ) {
    try {
      setBusy(true);
      setError("");

      replaceNote(
        await setApplicantInternalNoteImportance(
          applicantId,
          note._id,
          !note.important
        )
      );
    } catch (
      actionError
    ) {
      setError(
        messageFromError(
          actionError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function changeTaskStatus(
    note:
      ApplicantInternalNote,

    taskStatus:
      ApplicantInternalTaskStatus
  ) {
    try {
      setBusy(true);
      setError("");

      replaceNote(
        await setApplicantInternalTaskStatus(
          applicantId,
          note._id,
          taskStatus
        )
      );
    } catch (
      actionError
    ) {
      setError(
        messageFromError(
          actionError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function changeTaskPriority(
    note:
      ApplicantInternalNote,

    priority:
      ApplicantInternalTaskPriority
  ) {
    try {
      setBusy(true);
      setError("");

      replaceNote(
        await setApplicantInternalTaskPriority(
          applicantId,
          note._id,
          priority
        )
      );
    } catch (
      actionError
    ) {
      setError(
        messageFromError(
          actionError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function changeTaskAssignee(
    note:
      ApplicantInternalNote,

    assigneeUserId:
      string
  ) {
    try {
      setBusy(true);
      setError("");

      replaceNote(
        await setApplicantInternalTaskAssignee(
          applicantId,
          note._id,
          assigneeUserId
        )
      );
    } catch (
      actionError
    ) {
      setError(
        messageFromError(
          actionError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  /*
   * Schedule/reminder
   */

  function openSchedule(
    note:
      ApplicantInternalNote
  ) {
    setScheduleEditingId(
      note._id
    );

    setScheduleDraft(
      scheduleDraftFromNote(
        note
      )
    );
  }


  async function saveSchedule(
    note:
      ApplicantInternalNote
  ) {
    try {
      setBusy(true);
      setError("");

      replaceNote(
        await updateApplicantInternalNoteSchedule(
          applicantId,
          note._id,
          schedulePayload(
            scheduleDraft
          )
        )
      );

      setScheduleEditingId(
        null
      );

      setScheduleDraft(
        emptySchedule()
      );
    } catch (
      scheduleError
    ) {
      setError(
        messageFromError(
          scheduleError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  /*
   * Explicit Google Calendar actions
   *
   * These functions are intentionally separate
   * from note/task editing and schedule saving.
   */

  async function addToCalendar(
    note:
      ApplicantInternalNote
  ) {
    if (
      !note.schedule?.startAt ||
      !note.schedule?.endAt
    ) {
      setError(
        "Set both Start and End/Due date-time before adding this item to Google Calendar."
      );

      return;
    }

    try {
      setBusy(true);
      setError("");

      replaceNote(
        await addApplicantInternalNoteToCalendar(
          applicantId,
          note._id,
          browserTimeZone()
        )
      );
    } catch (
      calendarError
    ) {
      setError(
        messageFromError(
          calendarError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function updateCalendar(
    note:
      ApplicantInternalNote
  ) {
    try {
      setBusy(true);
      setError("");

      replaceNote(
        await updateApplicantInternalNoteCalendar(
          applicantId,
          note._id,
          browserTimeZone()
        )
      );
    } catch (
      calendarError
    ) {
      setError(
        messageFromError(
          calendarError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function removeFromCalendar(
    note:
      ApplicantInternalNote
  ) {
    if (
      !window.confirm(
        "Remove this internal note/task from Google Calendar? The external Calendar event will be deleted."
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      replaceNote(
        await removeApplicantInternalNoteFromCalendar(
          applicantId,
          note._id
        )
      );
    } catch (
      calendarError
    ) {
      setError(
        messageFromError(
          calendarError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  /*
   * Archive / restore /
   * permanent delete
   */

  async function archiveItem(
    note:
      ApplicantInternalNote
  ) {
    if (
      !window.confirm(
        `Archive this internal ${
          note.kind ===
          "task"
            ? "task"
            : "note"
        }? It can be restored later.`
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      const updated =
        await archiveApplicantInternalNote(
          applicantId,
          note._id
        );

      if (
        showArchivedItems
      ) {
        replaceNote(
          updated
        );
      } else {
        setNotes(
          current =>
            current.filter(
              item =>
                item._id !==
                note._id
            )
        );
      }
    } catch (
      archiveError
    ) {
      setError(
        messageFromError(
          archiveError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function restoreItem(
    note:
      ApplicantInternalNote
  ) {
    try {
      setBusy(true);
      setError("");

      replaceNote(
        await restoreApplicantInternalNote(
          applicantId,
          note._id
        )
      );
    } catch (
      restoreError
    ) {
      setError(
        messageFromError(
          restoreError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function permanentlyDeleteItem(
    note:
      ApplicantInternalNote
  ) {
    const confirmation =
      window.prompt(
        "Permanent deletion cannot be undone. Type DELETE to permanently remove this archived note/task and its replies."
      );

    if (
      confirmation !==
      "DELETE"
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      await permanentlyDeleteApplicantInternalNote(
        applicantId,
        note._id,
        "DELETE"
      );

      setNotes(
        current =>
          current.filter(
            item =>
              item._id !==
              note._id
          )
      );

      setRepliesByNote(
        current => {
          const next = {
            ...current,
          };

          delete next[
            note._id
          ];

          return next;
        }
      );
    } catch (
      deleteError
    ) {
      setError(
        messageFromError(
          deleteError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  /*
   * Replies
   */

  async function toggleReplies(
    note:
      ApplicantInternalNote
  ) {
    if (
      expandedRepliesId ===
      note._id
    ) {
      setExpandedRepliesId(
        null
      );

      return;
    }

    setExpandedRepliesId(
      note._id
    );

    if (
      repliesByNote[
        note._id
      ]
    ) {
      return;
    }

    try {
      setRepliesLoadingId(
        note._id
      );

      setError("");

      const replies =
        await fetchApplicantInternalNoteReplies(
          applicantId,
          note._id,
          {
            includeArchived:
              true,
          }
        );

      setRepliesByNote(
        current => ({
          ...current,

          [note._id]:
            replies,
        })
      );
    } catch (
      replyError
    ) {
      setError(
        messageFromError(
          replyError
        )
      );
    } finally {
      setRepliesLoadingId(
        null
      );
    }
  }


  async function addReply(
    note:
      ApplicantInternalNote
  ) {
    const content =
      (
        replyDraftByNote[
          note._id
        ] ||
        ""
      ).trim();

    if (!content) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      const created =
        await createApplicantInternalNoteReply(
          applicantId,
          note._id,
          content
        );

      setRepliesByNote(
        current => ({
          ...current,

          [note._id]: [
            ...(
              current[
                note._id
              ] ||
              []
            ),

            created,
          ],
        })
      );

      setReplyDraftByNote(
        current => ({
          ...current,

          [note._id]:
            "",
        })
      );
    } catch (
      replyError
    ) {
      setError(
        messageFromError(
          replyError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  function beginReplyEdit(
    reply:
      ApplicantInternalNoteReply
  ) {
    setEditingReplyId(
      reply._id
    );

    setEditReplyContent(
      reply.content
    );
  }


  async function saveReplyEdit(
    note:
      ApplicantInternalNote
  ) {
    if (
      !editingReplyId ||
      !editReplyContent.trim()
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      const updated =
        await updateApplicantInternalNoteReply(
          applicantId,
          note._id,
          editingReplyId,
          editReplyContent
        );

      setRepliesByNote(
        current => ({
          ...current,

          [note._id]: (
            current[
              note._id
            ] ||
            []
          ).map(
            reply =>
              reply._id ===
                updated._id
                ? updated
                : reply
          ),
        })
      );

      setEditingReplyId(
        null
      );

      setEditReplyContent("");
    } catch (
      replyError
    ) {
      setError(
        messageFromError(
          replyError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function archiveReply(
    note:
      ApplicantInternalNote,
    reply:
      ApplicantInternalNoteReply
  ) {
    if (
      !window.confirm(
        "Archive this reply? It can be restored later."
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      const updated =
        await archiveApplicantInternalNoteReply(
          applicantId,
          note._id,
          reply._id
        );

      setRepliesByNote(
        current => ({
          ...current,

          [note._id]: (
            current[
              note._id
            ] ||
            []
          ).map(
            item =>
              item._id ===
                updated._id
                ? updated
                : item
          ),
        })
      );
    } catch (
      replyError
    ) {
      setError(
        messageFromError(
          replyError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function restoreReply(
    note:
      ApplicantInternalNote,
    reply:
      ApplicantInternalNoteReply
  ) {
    try {
      setBusy(true);
      setError("");

      const updated =
        await restoreApplicantInternalNoteReply(
          applicantId,
          note._id,
          reply._id
        );

      setRepliesByNote(
        current => ({
          ...current,

          [note._id]: (
            current[
              note._id
            ] ||
            []
          ).map(
            item =>
              item._id ===
                updated._id
                ? updated
                : item
          ),
        })
      );
    } catch (
      replyError
    ) {
      setError(
        messageFromError(
          replyError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  async function permanentlyDeleteReply(
    note:
      ApplicantInternalNote,
    reply:
      ApplicantInternalNoteReply
  ) {
    const confirmation =
      window.prompt(
        "Type DELETE to permanently remove this archived reply."
      );

    if (
      confirmation !==
      "DELETE"
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");

      await permanentlyDeleteApplicantInternalNoteReply(
        applicantId,
        note._id,
        reply._id,
        "DELETE"
      );

      setRepliesByNote(
        current => ({
          ...current,

          [note._id]: (
            current[
              note._id
            ] ||
            []
          ).filter(
            item =>
              item._id !==
              reply._id
          ),
        })
      );
    } catch (
      replyError
    ) {
      setError(
        messageFromError(
          replyError
        )
      );
    } finally {
      setBusy(false);
    }
  }


  const operationalNow =
    new Date();


  const activeTasks =
    notes.filter(
      note =>
        note.kind ===
          "task" &&
        !note.archived
    );


  const actionableTasks =
    activeTasks.filter(
      note =>
        isActionableInternalTask(
          note
        )
    );


  const taskMetrics = {
    open:
      actionableTasks.length,

    inProgress:
      actionableTasks.filter(
        note =>
          internalTaskStatus(
            note
          ) ===
          "in_progress"
      ).length,

    overdue:
      actionableTasks.filter(
        note =>
          isInternalTaskOverdue(
            note,
            operationalNow
          )
      ).length,

    dueToday:
      actionableTasks.filter(
        note =>
          isInternalTaskDueToday(
            note,
            operationalNow
          )
      ).length,

    urgent:
      actionableTasks.filter(
        note =>
          note.priority ===
            "urgent"
      ).length,

    unassigned:
      actionableTasks.filter(
        note =>
          !note.assignee
            ?.userId
      ).length,
  };


  const visibleNotes =
    notes.filter(
      note =>
        matchesTaskView(
          note,
          taskViewFilter,
          currentUserId,
          operationalNow
        )
    );


  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-bold text-blue-800">
          Internal recruitment information
        </p>

        <p className="mt-1 text-[11px] leading-5 text-blue-700">
          Notes, tasks, replies, reminders and tags are internal to
          Applicant Management and remain separate from Applicant-submitted
          information.
        </p>
      </div>


      {archived && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
          This Applicant is archived. Internal information remains
          readable, but it cannot be changed until the Applicant is
          restored.
        </div>
      )}


      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}


      {/* =====================================================
          TAGS
      ===================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
            <Tag className="h-4 w-4" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Applicant Tags
            </h3>

            <p className="mt-1 text-[11px] text-slate-500">
              Tags feed Applicant search, filtering, segmentation and
              analytics.
            </p>
          </div>
        </div>


        <div className="mt-4 flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <span className="text-xs text-slate-400">
              No tags assigned.
            </span>
          ) : (
            tags.map(
              tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold text-violet-700"
                >
                  {tag}

                  {!archived && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        removeTag(
                          tag
                        )
                      }
                      className="rounded-full text-violet-400 hover:text-rose-600 disabled:opacity-40"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              )
            )
          )}
        </div>


        {!archived && (
          <>
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Suggested taxonomy
              </p>

              <div className="flex flex-wrap gap-2">
                {TAG_TAXONOMY.map(
                  tag => (
                    <button
                      key={tag}
                      type="button"
                      disabled={
                        busy ||
                        tags.includes(
                          tag
                        )
                      }
                      onClick={() =>
                        addTag(
                          tag
                        )
                      }
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + {tag}
                    </button>
                  )
                )}
              </div>
            </div>


            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={tagInput}
                maxLength={40}
                disabled={busy}
                placeholder="Custom tag, e.g. backend-senior"
                onChange={
                  event =>
                    setTagInput(
                      event.target.value
                    )
                }
                onKeyDown={
                  event => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();

                      addTag(
                        tagInput
                      );
                    }
                  }
                }
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400"
              />

              <button
                type="button"
                disabled={
                  busy ||
                  !tagInput.trim()
                }
                onClick={() =>
                  addTag(
                    tagInput
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Tag
              </button>

              <button
                type="button"
                disabled={
                  busy ||
                  !tagsDirty
                }
                onClick={() =>
                  void saveTags()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}

                Save Tags
              </button>
            </div>
          </>
        )}
      </section>


      {/* =====================================================
          NOTES / TASKS
      ===================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <StickyNote className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Internal Notes & Tasks
              </h3>

              <p className="mt-1 text-[11px] text-slate-500">
                Recruitment notes, actionable tasks, reminders, reactions
                and replies.
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-[10px] font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={
                showArchivedItems
              }
              onChange={
                event =>
                  setShowArchivedItems(
                    event.target
                      .checked
                  )
              }
              className="h-3.5 w-3.5 rounded border-slate-300"
            />

            Show archived
          </label>
        </div>


        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                Recruitment task operations
              </p>

              <p className="mt-0.5 text-[9px] text-slate-400">
                Open workload means To Do or In Progress. Overdue is derived from End / Due.
              </p>
            </div>

            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-slate-500">
              7-day upcoming window
            </span>
          </div>


          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label:
                  "Open",
                value:
                  taskMetrics.open,
              },
              {
                label:
                  "In Progress",
                value:
                  taskMetrics.inProgress,
              },
              {
                label:
                  "Overdue",
                value:
                  taskMetrics.overdue,
              },
              {
                label:
                  "Due Today",
                value:
                  taskMetrics.dueToday,
              },
              {
                label:
                  "Urgent",
                value:
                  taskMetrics.urgent,
              },
              {
                label:
                  "Unassigned",
                value:
                  taskMetrics.unassigned,
              },
            ].map(
              metric => (
                <div
                  key={
                    metric.label
                  }
                  className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                    {metric.label}
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {metric.value}
                  </p>
                </div>
              )
            )}
          </div>


          <div className="mt-3 flex flex-wrap gap-1.5">
            {TASK_VIEW_OPTIONS.map(
              option => {
                const selected =
                  taskViewFilter ===
                  option.value;

                const disabled =
                  option.value ===
                    "mine" &&
                  !currentUserId;

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    disabled={
                      disabled
                    }
                    title={
                      disabled
                        ? "Current user could not be resolved."
                        : undefined
                    }
                    onClick={() =>
                      setTaskViewFilter(
                        option.value
                      )
                    }
                    className={
                      `rounded-lg border px-2.5 py-1.5 text-[9px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        selected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
                      }`
                    }
                  >
                    {option.label}
                  </button>
                );
              }
            )}
          </div>
        </div>


        {!archived && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
              <select
                value={newKind}
                disabled={busy}
                onChange={
                  event =>
                    setNewKind(
                      event.target
                        .value as
                        ApplicantInternalNoteKind
                    )
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="note">
                  Note
                </option>

                <option value="task">
                  Task
                </option>
              </select>

              <textarea
                value={newContent}
                disabled={busy}
                maxLength={4000}
                rows={3}
                placeholder={
                  newKind ===
                  "task"
                    ? "Describe the internal task..."
                    : "Add an internal recruiter note..."
                }
                onChange={
                  event =>
                    setNewContent(
                      event.target.value
                    )
                }
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-blue-400"
              />

              <label className="flex items-center gap-2 self-start rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-700">
                <input
                  type="checkbox"
                  checked={
                    newImportant
                  }
                  disabled={busy}
                  onChange={
                    event =>
                      setNewImportant(
                        event.target
                          .checked
                      )
                  }
                />

                Important
              </label>
            </div>


            {newKind ===
              "task" && (
              <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                  Task ownership & priority
                </p>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Assigned To
                    </span>

                    <select
                      value={
                        newAssigneeUserId
                      }
                      disabled={
                        busy ||
                        taskAssigneesLoading
                      }
                      onChange={
                        event =>
                          setNewAssigneeUserId(
                            event.target
                              .value
                          )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <option value="">
                        Unassigned
                      </option>

                      {eligibleTaskAssignees.map(
                        user => (
                          <option
                            key={
                              user.id
                            }
                            value={
                              user.id
                            }
                          >
                            {user.name} · {user.role}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Priority
                    </span>

                    <select
                      value={
                        newPriority
                      }
                      disabled={busy}
                      onChange={
                        event =>
                          setNewPriority(
                            event.target
                              .value as
                              ApplicantInternalTaskPriority
                          )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      {TASK_PRIORITY_OPTIONS.map(
                        option => (
                          <option
                            key={
                              option.value ||
                              "unset"
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <p className="mt-2 text-[9px] text-slate-400">
                  Assignment identifies responsibility for this recruiting action.
                </p>
              </div>
            )}


            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Optional dates & reminder
              </p>

              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <label>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Start
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      newSchedule
                        .startAt
                    }
                    disabled={busy}
                    onChange={
                      event =>
                        setNewSchedule(
                          current => ({
                            ...current,

                            startAt:
                              event
                                .target
                                .value,
                          })
                        )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
                  />
                </label>

                <label>
                  <span className="text-[10px] font-semibold text-slate-500">
                    End / Due
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      newSchedule
                        .endAt
                    }
                    disabled={busy}
                    onChange={
                      event =>
                        setNewSchedule(
                          current => ({
                            ...current,

                            endAt:
                              event
                                .target
                                .value,
                          })
                        )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
                  />
                </label>

                <label>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Reminder
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      newSchedule
                        .reminderAt
                    }
                    disabled={busy}
                    onChange={
                      event =>
                        setNewSchedule(
                          current => ({
                            ...current,

                            reminderAt:
                              event
                                .target
                                .value,
                          })
                        )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
                  />
                </label>
              </div>

              <textarea
                value={
                  newSchedule
                    .reminderNote
                }
                disabled={busy}
                maxLength={1000}
                rows={2}
                placeholder="Optional reminder note..."
                onChange={
                  event =>
                    setNewSchedule(
                      current => ({
                        ...current,

                        reminderNote:
                          event
                            .target
                            .value,
                      })
                    )
                }
                className="mt-3 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />

              <p className="mt-2 text-[9px] text-slate-400">
                This reminder is internal only. Calendar synchronization
                requires a separate explicit Add to Calendar action.
              </p>
            </div>


            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400">
                {newContent.length}/4000
              </span>

              <button
                type="button"
                disabled={
                  busy ||
                  !newContent.trim()
                }
                onClick={() =>
                  void createItem()
                }
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}

                Add Internal{" "}
                {newKind ===
                "task"
                  ? "Task"
                  : "Note"}
              </button>
            </div>
          </div>
        )}


        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading internal notes and tasks...
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No internal notes or tasks yet.
            </div>
          ) : visibleNotes.length ===
            0 ? (
            <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center text-xs text-slate-500">
              No items match the selected task view.
            </div>
          ) : (
            visibleNotes.map(
              note => {
                const kind =
                  note.kind ===
                  "task"
                    ? "task"
                    : "note";

                const taskOverdue =
                  kind ===
                    "task" &&
                  isInternalTaskOverdue(
                    note,
                    operationalNow
                  );

                const taskDueToday =
                  kind ===
                    "task" &&
                  isInternalTaskDueToday(
                    note,
                    operationalNow
                  );

                const taskUnassigned =
                  kind ===
                    "task" &&
                  !note.archived &&
                  !note.assignee
                    ?.userId;

                const liked =
                  Boolean(
                    currentUserId &&
                    (
                      note.likedBy ||
                      []
                    ).includes(
                      currentUserId
                    )
                  );

                const starred =
                  Boolean(
                    currentUserId &&
                    (
                      note.starredBy ||
                      []
                    ).includes(
                      currentUserId
                    )
                  );

                const calendarEventId =
                  String(
                    note.calendar
                      ?.eventId ||
                    ""
                  ).trim();

                const calendarLinked =
                  Boolean(
                    calendarEventId
                  );

                const calendarSyncStatus =
                  note.calendar
                    ?.syncStatus ||
                  "not_synced";

                const calendarError =
                  calendarSyncStatus ===
                  "error";

                const calendarNeedsUpdate =
                  calendarLinked &&
                  calendarSyncStatus ===
                    "not_synced";

                const calendarReady =
                  Boolean(
                    note.schedule
                      ?.startAt &&
                    note.schedule
                      ?.endAt
                  );

                const replies =
                  repliesByNote[
                    note._id
                  ] ||
                  [];

                return (
                  <article
                    key={note._id}
                    className={
                      `rounded-xl border p-4 ${
                        note.archived
                          ? "border-slate-200 bg-slate-100/70"
                          : note.important
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-slate-100 bg-slate-50"
                      }`
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={
                          `rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${
                            kind ===
                            "task"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-blue-100 text-blue-700"
                          }`
                        }>
                          {kind}
                        </span>

                        {note.important && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold uppercase text-amber-700">
                            <Flag className="h-3 w-3" />
                            Important
                          </span>
                        )}

                        {kind ===
                          "task" && (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[9px] font-bold uppercase text-indigo-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {taskStatusLabel(
                                note.taskStatus
                              )}
                            </span>

                            {note.priority && (
                              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[9px] font-bold uppercase text-rose-700">
                                {taskPriorityLabel(
                                  note.priority
                                )} Priority
                              </span>
                            )}
                          </>
                        )}

                        {kind ===
                          "task" &&
                          taskOverdue && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[9px] font-bold uppercase text-rose-700">
                            Overdue
                          </span>
                        )}

                        {kind ===
                          "task" &&
                          !taskOverdue &&
                          taskDueToday && (
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[9px] font-bold uppercase text-orange-700">
                            Due Today
                          </span>
                        )}

                        {kind ===
                          "task" &&
                          taskUnassigned && (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[9px] font-bold uppercase text-slate-600">
                            Unassigned
                          </span>
                        )}

                        {note.archived && (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[9px] font-bold uppercase text-slate-600">
                            Archived
                          </span>
                        )}
                      </div>

                      {!note.archived && (
                        <button
                          type="button"
                          disabled={
                            busy ||
                            !currentUserId
                          }
                          title={
                            starred
                              ? "Unstar"
                              : "Star"
                          }
                          onClick={() =>
                            void toggleStar(
                              note
                            )
                          }
                          className={
                            `rounded-lg p-2 ${
                              starred
                                ? "bg-amber-100 text-amber-600"
                                : "text-slate-400 hover:bg-white hover:text-amber-500"
                            } disabled:opacity-40`
                          }
                        >
                          <Star
                            className="h-4 w-4"
                            fill={
                              starred
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      )}
                    </div>


                    {editingId ===
                    note._id ? (
                      <div className="mt-3">
                        <textarea
                          value={
                            editContent
                          }
                          disabled={busy}
                          maxLength={4000}
                          rows={4}
                          onChange={
                            event =>
                              setEditContent(
                                event.target
                                  .value
                              )
                          }
                          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-blue-400"
                        />

                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setEditingId(
                                null
                              );

                              setEditContent("");
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            disabled={
                              busy ||
                              !editContent.trim()
                            }
                            onClick={() =>
                              void saveEdit()
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-700">
                        {note.content}
                      </p>
                    )}


                    {kind ===
                      "task" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="rounded-md bg-white px-2 py-1 font-semibold text-slate-600">
                          Assigned to:{" "}
                          {
                            note.assignee
                              ?.name ||
                            note.assignee
                              ?.email ||
                            "Unassigned"
                          }
                        </span>

                        <span className="rounded-md bg-white px-2 py-1 font-semibold text-slate-600">
                          Priority:{" "}
                          {taskPriorityLabel(
                            note.priority
                          )}
                        </span>
                      </div>
                    )}


                    {hasSchedule(
                      note
                    ) && (
                      <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[10px] text-slate-500 sm:grid-cols-3">
                        <div>
                          <span className="font-bold text-slate-600">
                            Start
                          </span>

                          <p className="mt-0.5">
                            {formatDateTime(
                              note
                                .schedule
                                ?.startAt
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-slate-600">
                            End / Due
                          </span>

                          <p className="mt-0.5">
                            {formatDateTime(
                              note
                                .schedule
                                ?.endAt
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-slate-600">
                            Reminder
                          </span>

                          <p className="mt-0.5">
                            {formatDateTime(
                              note
                                .schedule
                                ?.reminderAt
                            )}
                          </p>
                        </div>

                        {note.schedule
                          ?.reminderNote && (
                          <p className="sm:col-span-3 rounded-md bg-blue-50 px-2 py-1.5 text-blue-700">
                            Reminder note:{" "}
                            {
                              note.schedule
                                .reminderNote
                            }
                          </p>
                        )}
                      </div>
                    )}


                    {scheduleEditingId ===
                      note._id && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label>
                            <span className="text-[10px] font-semibold text-slate-500">
                              Start
                            </span>

                            <input
                              type="datetime-local"
                              value={
                                scheduleDraft
                                  .startAt
                              }
                              disabled={busy}
                              onChange={
                                event =>
                                  setScheduleDraft(
                                    current => ({
                                      ...current,

                                      startAt:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                            />
                          </label>

                          <label>
                            <span className="text-[10px] font-semibold text-slate-500">
                              End / Due
                            </span>

                            <input
                              type="datetime-local"
                              value={
                                scheduleDraft
                                  .endAt
                              }
                              disabled={busy}
                              onChange={
                                event =>
                                  setScheduleDraft(
                                    current => ({
                                      ...current,

                                      endAt:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                            />
                          </label>

                          <label>
                            <span className="text-[10px] font-semibold text-slate-500">
                              Reminder
                            </span>

                            <input
                              type="datetime-local"
                              value={
                                scheduleDraft
                                  .reminderAt
                              }
                              disabled={busy}
                              onChange={
                                event =>
                                  setScheduleDraft(
                                    current => ({
                                      ...current,

                                      reminderAt:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                            />
                          </label>
                        </div>

                        <textarea
                          value={
                            scheduleDraft
                              .reminderNote
                          }
                          disabled={busy}
                          maxLength={1000}
                          rows={2}
                          placeholder="Reminder note..."
                          onChange={
                            event =>
                              setScheduleDraft(
                                current => ({
                                  ...current,

                                  reminderNote:
                                    event
                                      .target
                                      .value,
                                })
                              )
                          }
                          className="mt-3 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        />

                        <p className="mt-2 text-[9px] text-slate-400">
                          Internal reminder only. Nothing is written to
                          Google Calendar here.
                        </p>

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setScheduleEditingId(
                                null
                              );

                              setScheduleDraft(
                                emptySchedule()
                              );
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void saveSchedule(
                                note
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
                          >
                            <Save className="h-3 w-3" />
                            Save Schedule
                          </button>
                        </div>
                      </div>
                    )}


                    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                          <Calendar className="h-3.5 w-3.5" />
                          Google Calendar
                        </span>

                        <span
                          className={
                            `rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              calendarError
                                ? "bg-rose-100 text-rose-700"
                                : calendarLinked &&
                                  calendarSyncStatus ===
                                    "synced"
                                ? "bg-emerald-100 text-emerald-700"
                                : calendarNeedsUpdate
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                            }`
                          }
                        >
                          {calendarError
                            ? "Error"
                            : calendarLinked &&
                              calendarSyncStatus ===
                                "synced"
                            ? "Synced"
                            : calendarNeedsUpdate
                            ? "Needs update"
                            : "Not added"}
                        </span>
                      </div>

                      {calendarError &&
                        note.calendar
                          ?.syncError && (
                        <p className="mt-1.5 text-[9px] leading-4 text-rose-600">
                          {
                            note.calendar
                              .syncError
                          }
                        </p>
                      )}

                      {calendarLinked &&
                        note.calendar
                          ?.syncedAt && (
                        <p className="mt-1 text-[9px] text-slate-400">
                          Last synced{" "}
                          {formatDateTime(
                            note.calendar
                              .syncedAt
                          )}
                        </p>
                      )}
                    </div>


                    <div className="mt-3 text-[10px] leading-4 text-slate-400">
                      <p className="font-semibold text-slate-500">
                        {note.author
                          ?.name ||
                          note.author
                            ?.email ||
                          note.author
                            ?.userId ||
                          "Administrator"}
                      </p>

                      <p>
                        Created{" "}
                        {formatDateTime(
                          note.createdAt
                        )}
                      </p>

                      {note.updatedAt &&
                        note.updatedAt !==
                          note.createdAt && (
                        <p>
                          Updated{" "}
                          {formatDateTime(
                            note.updatedAt
                          )}
                        </p>
                      )}
                    </div>


                    {!archived && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200 pt-3">
                        {note.archived ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void restoreItem(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 disabled:opacity-40"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </button>

                            {calendarLinked && (
                              <>
                                {note.calendar
                                  ?.eventUrl && (
                                  <a
                                    href={
                                      note.calendar
                                        .eventUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700"
                                  >
                                    <Calendar className="h-3 w-3" />
                                    Open Calendar
                                  </a>
                                )}

                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void removeFromCalendar(
                                      note
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 disabled:opacity-40"
                                >
                                  <X className="h-3 w-3" />
                                  Remove from Calendar
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              disabled={
                                busy ||
                                calendarLinked
                              }
                              title={
                                calendarLinked
                                  ? "Remove the Google Calendar event before permanent deletion"
                                  : undefined
                              }
                              onClick={() =>
                                void permanentlyDeleteItem(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 disabled:opacity-40"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete Permanently
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={
                                busy ||
                                !currentUserId
                              }
                              onClick={() =>
                                void toggleLike(
                                  note
                                )
                              }
                              className={
                                `inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-40 ${
                                  liked
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`
                              }
                            >
                              <Heart
                                className="h-3 w-3"
                                fill={
                                  liked
                                    ? "currentColor"
                                    : "none"
                                }
                              />

                              {liked
                                ? "Unlike"
                                : "Like"}

                              {(
                                note.likedBy ||
                                []
                              ).length >
                                0 && (
                                <span>
                                  {
                                    (
                                      note.likedBy ||
                                      []
                                    ).length
                                  }
                                </span>
                              )}
                            </button>


                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void toggleReplies(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600"
                            >
                              <MessageSquare className="h-3 w-3" />

                              Reply

                              {replies.length >
                                0 && (
                                <span>
                                  {
                                    replies.filter(
                                      item =>
                                        !item.archived
                                    ).length
                                  }
                                </span>
                              )}
                            </button>


                            <button
                              type="button"
                              disabled={
                                busy ||
                                !currentUserId
                              }
                              onClick={() =>
                                void toggleStar(
                                  note
                                )
                              }
                              className={
                                `inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-40 ${
                                  starred
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`
                              }
                            >
                              <Star
                                className="h-3 w-3"
                                fill={
                                  starred
                                    ? "currentColor"
                                    : "none"
                                }
                              />

                              {starred
                                ? "Unstar"
                                : "Star"}
                            </button>


                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void toggleImportant(
                                  note
                                )
                              }
                              className={
                                `inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${
                                  note.important
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-white text-slate-600"
                                } disabled:opacity-40`
                              }
                            >
                              <Flag className="h-3 w-3" />

                              {note.important
                                ? "Mark Normal"
                                : "Important"}
                            </button>


                            {kind ===
                              "task" && (
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  aria-label="Task status"
                                  value={
                                    note.taskStatus ||
                                    "todo"
                                  }
                                  disabled={busy}
                                  onChange={
                                    event =>
                                      void changeTaskStatus(
                                        note,
                                        event.target
                                          .value as
                                          ApplicantInternalTaskStatus
                                      )
                                  }
                                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-indigo-700 disabled:opacity-40"
                                >
                                  {TASK_STATUS_OPTIONS.map(
                                    option => (
                                      <option
                                        key={
                                          option.value
                                        }
                                        value={
                                          option.value
                                        }
                                      >
                                        {option.label}
                                      </option>
                                    )
                                  )}
                                </select>

                                <select
                                  aria-label="Task assignee"
                                  value={
                                    note.assignee
                                      ?.userId ||
                                    ""
                                  }
                                  disabled={
                                    busy ||
                                    taskAssigneesLoading
                                  }
                                  onChange={
                                    event =>
                                      void changeTaskAssignee(
                                        note,
                                        event.target
                                          .value
                                      )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
                                >
                                  <option value="">
                                    Unassigned
                                  </option>

                                  {eligibleTaskAssignees.map(
                                    user => (
                                      <option
                                        key={
                                          user.id
                                        }
                                        value={
                                          user.id
                                        }
                                      >
                                        {user.name} · {user.role}
                                      </option>
                                    )
                                  )}
                                </select>

                                <select
                                  aria-label="Task priority"
                                  value={
                                    note.priority ||
                                    ""
                                  }
                                  disabled={busy}
                                  onChange={
                                    event =>
                                      void changeTaskPriority(
                                        note,
                                        event.target
                                          .value as
                                          ApplicantInternalTaskPriority
                                      )
                                  }
                                  className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 disabled:opacity-40"
                                >
                                  {TASK_PRIORITY_OPTIONS.map(
                                    option => (
                                      <option
                                        key={
                                          option.value ||
                                          "unset"
                                        }
                                        value={
                                          option.value
                                        }
                                      >
                                        {option.label}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            )}


                            {!calendarLinked ? (
                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  !calendarReady
                                }
                                title={
                                  calendarReady
                                    ? "Create a Google Calendar event"
                                    : "Set Start and End/Due before adding to Calendar"
                                }
                                onClick={() =>
                                  void addToCalendar(
                                    note
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 disabled:opacity-40"
                              >
                                <Calendar className="h-3 w-3" />
                                Add to Calendar
                              </button>
                            ) : (
                              <>
                                {(calendarNeedsUpdate ||
                                  calendarError) && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void updateCalendar(
                                        note
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 disabled:opacity-40"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Update Calendar
                                  </button>
                                )}

                                {note.calendar
                                  ?.eventUrl && (
                                  <a
                                    href={
                                      note.calendar
                                        .eventUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700"
                                  >
                                    <Calendar className="h-3 w-3" />
                                    Open Calendar
                                  </a>
                                )}

                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void removeFromCalendar(
                                      note
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 disabled:opacity-40"
                                >
                                  <X className="h-3 w-3" />
                                  Remove from Calendar
                                </button>
                              </>
                            )}


                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                openSchedule(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 disabled:opacity-40"
                            >
                              <Calendar className="h-3 w-3" />
                              Dates / Reminder
                            </button>


                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                beginEdit(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>


                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void archiveItem(
                                  note
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40"
                            >
                              <Archive className="h-3 w-3" />
                              Archive
                            </button>
                          </>
                        )}
                      </div>
                    )}


                    {archived &&
                      calendarLinked && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200 pt-3">
                        <span className="mr-1 self-center text-[9px] font-semibold text-slate-400">
                          Archived Applicant — Calendar cleanup:
                        </span>

                        {note.calendar
                          ?.eventUrl && (
                          <a
                            href={
                              note.calendar
                                .eventUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700"
                          >
                            <Calendar className="h-3 w-3" />
                            Open Calendar
                          </a>
                        )}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void removeFromCalendar(
                              note
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 disabled:opacity-40"
                        >
                          <X className="h-3 w-3" />
                          Remove from Calendar
                        </button>
                      </div>
                    )}


                    {expandedRepliesId ===
                      note._id && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Replies
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRepliesId(
                                null
                              )
                            }
                            className="rounded p-1 text-slate-400 hover:bg-slate-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>


                        {repliesLoadingId ===
                          note._id ? (
                          <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading replies...
                          </div>
                        ) : (
                          <>
                            <div className="mt-3 space-y-2">
                              {replies.length ===
                              0 ? (
                                <p className="rounded-md border border-dashed border-slate-200 p-3 text-[10px] text-slate-400">
                                  No replies yet.
                                </p>
                              ) : (
                                replies.map(
                                  reply => (
                                    <div
                                      key={
                                        reply._id
                                      }
                                      className={
                                        `rounded-lg border p-3 ${
                                          reply.archived
                                            ? "border-slate-200 bg-slate-100"
                                            : "border-slate-100 bg-slate-50"
                                        }`
                                      }
                                    >
                                      {editingReplyId ===
                                      reply._id ? (
                                        <>
                                          <textarea
                                            value={
                                              editReplyContent
                                            }
                                            disabled={busy}
                                            maxLength={2000}
                                            rows={2}
                                            onChange={
                                              event =>
                                                setEditReplyContent(
                                                  event
                                                    .target
                                                    .value
                                                )
                                            }
                                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                          />

                                          <div className="mt-2 flex justify-end gap-2">
                                            <button
                                              type="button"
                                              disabled={busy}
                                              onClick={() => {
                                                setEditingReplyId(
                                                  null
                                                );

                                                setEditReplyContent(
                                                  ""
                                                );
                                              }}
                                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-semibold text-slate-600"
                                            >
                                              Cancel
                                            </button>

                                            <button
                                              type="button"
                                              disabled={
                                                busy ||
                                                !editReplyContent.trim()
                                              }
                                              onClick={() =>
                                                void saveReplyEdit(
                                                  note
                                                )
                                              }
                                              className="rounded-lg bg-blue-600 px-2.5 py-1 text-[9px] font-semibold text-white disabled:opacity-40"
                                            >
                                              Save
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <p className="whitespace-pre-wrap text-[11px] leading-5 text-slate-700">
                                            {
                                              reply.content
                                            }
                                          </p>

                                          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                                            <div className="text-[9px] text-slate-400">
                                              <p className="font-semibold text-slate-500">
                                                {reply
                                                  .author
                                                  ?.name ||
                                                  reply
                                                    .author
                                                    ?.email ||
                                                  "Administrator"}
                                              </p>

                                              <p>
                                                {
                                                  formatDateTime(
                                                    reply.createdAt
                                                  )
                                                }
                                              </p>
                                            </div>

                                            {!archived &&
                                              !note.archived && (
                                              <div className="flex gap-1">
                                                {reply.archived ? (
                                                  <>
                                                    <button
                                                      type="button"
                                                      disabled={busy}
                                                      onClick={() =>
                                                        void restoreReply(
                                                          note,
                                                          reply
                                                        )
                                                      }
                                                      className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[9px] font-semibold text-emerald-700"
                                                    >
                                                      Restore
                                                    </button>

                                                    <button
                                                      type="button"
                                                      disabled={busy}
                                                      onClick={() =>
                                                        void permanentlyDeleteReply(
                                                          note,
                                                          reply
                                                        )
                                                      }
                                                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[9px] font-semibold text-rose-700"
                                                    >
                                                      Delete
                                                    </button>
                                                  </>
                                                ) : (
                                                  <>
                                                    <button
                                                      type="button"
                                                      disabled={busy}
                                                      onClick={() =>
                                                        beginReplyEdit(
                                                          reply
                                                        )
                                                      }
                                                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600"
                                                    >
                                                      Edit
                                                    </button>

                                                    <button
                                                      type="button"
                                                      disabled={busy}
                                                      onClick={() =>
                                                        void archiveReply(
                                                          note,
                                                          reply
                                                        )
                                                      }
                                                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-semibold text-slate-600"
                                                    >
                                                      Archive
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )
                                )
                              )}
                            </div>


                            {!archived &&
                              !note.archived && (
                              <div className="mt-3">
                                <textarea
                                  value={
                                    replyDraftByNote[
                                      note._id
                                    ] ||
                                    ""
                                  }
                                  disabled={busy}
                                  maxLength={2000}
                                  rows={2}
                                  placeholder="Write a reply..."
                                  onChange={
                                    event =>
                                      setReplyDraftByNote(
                                        current => ({
                                          ...current,

                                          [note._id]:
                                            event
                                              .target
                                              .value,
                                        })
                                      )
                                  }
                                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />

                                <div className="mt-2 flex justify-end">
                                  <button
                                    type="button"
                                    disabled={
                                      busy ||
                                      !(
                                        replyDraftByNote[
                                          note._id
                                        ] ||
                                        ""
                                      ).trim()
                                    }
                                    onClick={() =>
                                      void addReply(
                                        note
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    Add Reply
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )
          )}
        </div>
      </section>
    </div>
  );
}
