import {
  useMemo,
  useState,
  type DragEvent,
} from "react";

import {
  Eye,
  Flag,
  GripVertical,
  Loader2,
  MessageSquare,
  Plus,
  Users,
  X,
} from "lucide-react";

import {
  createApplicantInternalNote,
  fetchApplicantInternalNotes,
  type ApplicantInternalNote,
  type ApplicantInternalNoteKind,
  type ApplicantMaster,
  type ApplicantPipelineDefinition,
  type ApplicantPipelineStage,
  type ApplicantStatus,
} from "../../services/api";


interface ApplicantPipelineBoardProps {
  applicants:
    ApplicantMaster[];

  pipeline:
    ApplicantPipelineDefinition | null;

  loading?: boolean;

  error?: string | null;

  total?: number;

  onMove: (
    applicant: ApplicantMaster,
    nextStatus: ApplicantStatus
  ) => Promise<void>;

  onOpenApplicant: (
    applicant: ApplicantMaster
  ) => void;
}


function formatDate(
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
    return value;
  }

  return date.toLocaleDateString();
}


function pipelineTaskStatusLabel(
  status?:
    string
) {
  switch (status) {
    case "in_progress":
      return "In Progress";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "todo":
    default:
      return "To Do";
  }
}


function pipelineTaskPriorityLabel(
  priority?:
    string
) {
  switch (priority) {
    case "low":
      return "Low";

    case "medium":
      return "Medium";

    case "high":
      return "High";

    case "urgent":
      return "Urgent";

    default:
      return "";
  }
}


function stageLabel(
  pipeline:
    ApplicantPipelineDefinition,
  status:
    ApplicantStatus
) {
  return (
    pipeline.stages.find(
      (stage) =>
        stage.value === status
    )?.label ||
    status
  );
}


export function ApplicantPipelineBoard({
  applicants,
  pipeline,
  loading = false,
  error = null,
  total = 0,
  onMove,
  onOpenApplicant,
}: ApplicantPipelineBoardProps) {
  const [
    draggingApplicantId,
    setDraggingApplicantId,
  ] = useState<
    string | null
  >(null);

  const [
    movingApplicantId,
    setMovingApplicantId,
  ] = useState<
    string | null
  >(null);

  const [
    dragTarget,
    setDragTarget,
  ] = useState<
    ApplicantStatus | null
  >(null);


  const [
    expandedTagsApplicantId,
    setExpandedTagsApplicantId,
  ] = useState<
    string | null
  >(null);


  const [
    notesApplicantId,
    setNotesApplicantId,
  ] = useState<
    string | null
  >(null);

  const [
    notesByApplicant,
    setNotesByApplicant,
  ] = useState<
    Record<
      string,
      ApplicantInternalNote[]
    >
  >({});

  const [
    notesLoadingApplicantId,
    setNotesLoadingApplicantId,
  ] = useState<
    string | null
  >(null);

  const [
    noteSavingApplicantId,
    setNoteSavingApplicantId,
  ] = useState<
    string | null
  >(null);

  const [
    quickNoteByApplicant,
    setQuickNoteByApplicant,
  ] = useState<
    Record<
      string,
      string
    >
  >({});


  const [
    quickKindByApplicant,
    setQuickKindByApplicant,
  ] = useState<
    Record<
      string,
      ApplicantInternalNoteKind
    >
  >({});


  const stages =
    useMemo(
      () =>
        pipeline
          ? [
              ...pipeline.stages,
            ].sort(
              (a, b) =>
                a.order -
                b.order
            )
          : [],
      [pipeline]
    );


  const draggingApplicant =
    draggingApplicantId
      ? applicants.find(
          (applicant) =>
            applicant._id ===
            draggingApplicantId
        ) || null
      : null;


  function applicantsForStage(
    stage:
      ApplicantPipelineStage
  ) {
    return applicants.filter(
      (applicant) =>
        applicant
          .recruitment
          .status ===
        stage.value
    );
  }


  function isAllowedDrop(
    stage:
      ApplicantPipelineStage
  ) {
    if (
      !pipeline ||
      !draggingApplicant
    ) {
      return false;
    }

    const currentStatus =
      draggingApplicant
        .recruitment
        .status;

    if (
      currentStatus ===
      stage.value
    ) {
      return false;
    }

    return (
      pipeline
        .transitions[
          currentStatus
        ]?.includes(
          stage.value
        ) === true
    );
  }


  async function toggleApplicantNotes(
    applicant:
      ApplicantMaster
  ) {
    const applicantId =
      applicant._id;

    if (
      notesApplicantId ===
      applicantId
    ) {
      setNotesApplicantId(
        null
      );

      return;
    }

    setNotesApplicantId(
      applicantId
    );

    /*
     * Always re-fetch on open so changes made
     * inside the full Applicant profile appear
     * on the pipeline card immediately.
     */
    try {
      setNotesLoadingApplicantId(
        applicantId
      );

      const notes =
        await fetchApplicantInternalNotes(
          applicantId
        );

      setNotesByApplicant(
        current => ({
          ...current,
          [applicantId]:
            notes,
        })
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to load internal notes and tasks."
      );

      setNotesApplicantId(
        null
      );
    } finally {
      setNotesLoadingApplicantId(
        null
      );
    }
  }


  async function addQuickInternalNote(
    applicant:
      ApplicantMaster
  ) {
    const applicantId =
      applicant._id;

    const content =
      (
        quickNoteByApplicant[
          applicantId
        ] ||
        ""
      ).trim();

    const kind =
      quickKindByApplicant[
        applicantId
      ] ||
      "note";

    if (!content) {
      return;
    }

    try {
      setNoteSavingApplicantId(
        applicantId
      );

      const created =
        await createApplicantInternalNote(
          applicantId,
          content,
          {
            kind,
          }
        );

      setNotesByApplicant(
        current => ({
          ...current,

          [applicantId]: [
            created,
            ...(
              current[
                applicantId
              ] ||
              []
            ),
          ],
        })
      );

      setQuickNoteByApplicant(
        current => ({
          ...current,

          [applicantId]:
            "",
        })
      );

      setQuickKindByApplicant(
        current => ({
          ...current,

          [applicantId]:
            "note",
        })
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to add internal note or task."
      );
    } finally {
      setNoteSavingApplicantId(
        null
      );
    }
  }


  async function moveApplicant(
    applicant:
      ApplicantMaster,
    nextStatus:
      ApplicantStatus
  ) {
    const currentStatus =
      applicant
        .recruitment
        .status;

    if (
      currentStatus ===
      nextStatus
    ) {
      return;
    }

    if (
      !pipeline
        ?.transitions[
          currentStatus
        ]?.includes(
          nextStatus
        )
    ) {
      window.alert(
        `Moving from ${
          pipeline
            ? stageLabel(
                pipeline,
                currentStatus
              )
            : currentStatus
        } to ${
          pipeline
            ? stageLabel(
                pipeline,
                nextStatus
              )
            : nextStatus
        } is not allowed.`
      );

      return;
    }

    try {
      setMovingApplicantId(
        applicant._id
      );

      await onMove(
        applicant,
        nextStatus
      );
    } finally {
      setMovingApplicantId(
        null
      );
    }
  }


  async function handleDrop(
    event:
      DragEvent<HTMLDivElement>,
    stage:
      ApplicantPipelineStage
  ) {
    event.preventDefault();

    if (
      !draggingApplicant ||
      !isAllowedDrop(stage)
    ) {
      setDragTarget(null);
      return;
    }

    const applicant =
      draggingApplicant;

    setDraggingApplicantId(
      null
    );

    setDragTarget(
      null
    );

    await moveApplicant(
      applicant,
      stage.value
    );
  }


  if (!pipeline) {
    return (
      <section className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />

        <p className="mt-3 text-xs text-slate-500">
          Loading recruitment pipeline...
        </p>
      </section>
    );
  }


  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Recruitment Pipeline
          </h3>

          <p className="mt-0.5 text-xs text-slate-500">
            Drag Applicants between valid stages or use the Move selector on each card.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users className="h-4 w-4" />

          <span>
            {total} applicant
            {total === 1
              ? ""
              : "s"}
          </span>

          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          )}
        </div>
      </div>


      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}


      {total > 200 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          The pipeline currently displays the first 200 Applicants matching the active filters.
        </div>
      )}


      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[1680px] grid-cols-7 gap-3">
          {stages.map(
            (stage) => {
              const stageApplicants =
                applicantsForStage(
                  stage
                );

              const allowedTarget =
                isAllowedDrop(
                  stage
                );

              const activeTarget =
                dragTarget ===
                  stage.value &&
                allowedTarget;

              return (
                <div
                  key={
                    stage.value
                  }
                  onDragOver={(
                    event
                  ) => {
                    if (
                      allowedTarget
                    ) {
                      event.preventDefault();

                      setDragTarget(
                        stage.value
                      );
                    }
                  }}
                  onDragLeave={() => {
                    if (
                      dragTarget ===
                      stage.value
                    ) {
                      setDragTarget(
                        null
                      );
                    }
                  }}
                  onDrop={(
                    event
                  ) =>
                    void handleDrop(
                      event,
                      stage
                    )
                  }
                  className={
                    `min-h-[470px] rounded-xl border p-3 transition ${
                      activeTarget
                        ? "border-blue-400 bg-blue-50"
                        : allowedTarget
                          ? "border-blue-200 bg-slate-50"
                          : "border-slate-200 bg-slate-50"
                    }`
                  }
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {
                          stage.label
                        }
                      </h4>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Stage{" "}
                        {
                          stage.order
                        }
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
                      {
                        stageApplicants
                          .length
                      }
                    </span>
                  </div>


                  <div className="space-y-2">
                    {
                      stageApplicants
                        .length ===
                      0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-[10px] text-slate-400">
                          No Applicants
                        </div>
                      ) : (
                        stageApplicants.map(
                          (
                            applicant
                          ) => {
                            const currentStatus =
                              applicant
                                .recruitment
                                .status;

                            const transitions =
                              pipeline
                                .transitions[
                                  currentStatus
                                ] || [];

                            const moving =
                              movingApplicantId ===
                              applicant._id;

                            return (
                              <article
                                key={
                                  applicant._id
                                }
                                draggable={
                                  !moving &&
                                  !applicant
                                    .lifecycle
                                    .archived
                                }
                                onDragStart={() => {
                                  setDraggingApplicantId(
                                    applicant._id
                                  );
                                }}
                                onDragEnd={() => {
                                  setDraggingApplicantId(
                                    null
                                  );

                                  setDragTarget(
                                    null
                                  );
                                }}
                                className={
                                  `rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
                                    draggingApplicantId ===
                                    applicant._id
                                      ? "opacity-50"
                                      : ""
                                  }`
                                }
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-900">
                                      {
                                        applicant
                                          .identity
                                          .fullName
                                      }
                                    </p>

                                    <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                      {
                                        applicant
                                          .identity
                                          .email
                                      }
                                    </p>
                                  </div>

                                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                                </div>


                                <div className="mt-3 space-y-1 text-[10px]">
                                  <p className="truncate text-slate-600">
                                    {
                                      applicant
                                        .preferences
                                        .positionTrack ||
                                      "No position"
                                    }
                                  </p>

                                  <p className="text-slate-400">
                                    Applied:{" "}
                                    {formatDate(
                                      applicant
                                        .recruitment
                                        .lastAppliedAt ||
                                        applicant
                                          .recruitment
                                          .firstAppliedAt ||
                                        applicant
                                          .createdAt
                                    )}
                                  </p>
                                </div>


                                {(
                                  applicant
                                    .recruitment
                                    .tags || []
                                ).length > 0 && (
                                  <div className="mt-2">
                                    <div className="flex flex-wrap gap-1">
                                      {(
                                        applicant
                                          .recruitment
                                          .tags || []
                                      )
                                        .slice(0, 2)
                                        .map(
                                          (tag) => (
                                            <span
                                              key={tag}
                                              title={tag}
                                              className="max-w-[95px] truncate rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700"
                                            >
                                              {tag}
                                            </span>
                                          )
                                        )}

                                      {(
                                        applicant
                                          .recruitment
                                          .tags || []
                                      ).length > 2 && (
                                        <button
                                          type="button"
                                          onMouseDown={(
                                            event
                                          ) =>
                                            event.stopPropagation()
                                          }
                                          onClick={(
                                            event
                                          ) => {
                                            event.stopPropagation();

                                            setExpandedTagsApplicantId(
                                              current =>
                                                current ===
                                                  applicant._id
                                                  ? null
                                                  : applicant._id
                                            );
                                          }}
                                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 hover:bg-violet-100 hover:text-violet-700"
                                          title="Show all tags"
                                        >
                                          {expandedTagsApplicantId ===
                                          applicant._id
                                            ? "Hide"
                                            : `+${
                                                (
                                                  applicant
                                                    .recruitment
                                                    .tags || []
                                                ).length - 2
                                              }`}
                                        </button>
                                      )}
                                    </div>

                                    {expandedTagsApplicantId ===
                                      applicant._id && (
                                      <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50/50 p-2">
                                        <div className="mb-1.5 flex items-center justify-between">
                                          <span className="text-[9px] font-bold uppercase tracking-wide text-violet-700">
                                            All Tags
                                          </span>

                                          <span className="text-[9px] font-semibold text-slate-500">
                                            {
                                              (
                                                applicant
                                                  .recruitment
                                                  .tags || []
                                              ).length
                                            }{" "}
                                            total
                                          </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                          {(
                                            applicant
                                              .recruitment
                                              .tags || []
                                          ).map(
                                            (tag) => (
                                              <span
                                                key={tag}
                                                className="break-all rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-violet-700 shadow-sm"
                                              >
                                                {tag}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}


                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onMouseDown={(
                                      event
                                    ) =>
                                      event.stopPropagation()
                                    }
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      void toggleApplicantNotes(
                                        applicant
                                      );
                                    }}
                                    className={
                                      `inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-semibold transition ${
                                        notesApplicantId ===
                                        applicant._id
                                          ? "border-blue-200 bg-blue-50 text-blue-700"
                                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                      }`
                                    }
                                  >
                                    <MessageSquare className="h-3 w-3" />

                                    Notes & Tasks

                                    {notesByApplicant[
                                      applicant._id
                                    ] && (
                                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[8px] font-bold text-blue-700 shadow-sm">
                                        {
                                          notesByApplicant[
                                            applicant._id
                                          ].length
                                        }
                                      </span>
                                    )}
                                  </button>
                                </div>


                                {notesApplicantId ===
                                  applicant._id && (
                                  <div
                                    onMouseDown={(
                                      event
                                    ) =>
                                      event.stopPropagation()
                                    }
                                    onClick={(
                                      event
                                    ) =>
                                      event.stopPropagation()
                                    }
                                    className="mt-2 rounded-lg border border-blue-100 bg-blue-50/40 p-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                          Internal Notes & Tasks
                                        </p>

                                        <p className="mt-0.5 text-[8px] text-slate-400">
                                          Internal Applicant workflow
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        title="Close Notes & Tasks"
                                        onClick={() =>
                                          setNotesApplicantId(
                                            null
                                          )
                                        }
                                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>


                                    {notesLoadingApplicantId ===
                                      applicant._id ? (
                                      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-500">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Loading notes and tasks...
                                      </div>
                                    ) : (
                                      <>
                                        {notesByApplicant[
                                          applicant._id
                                        ] && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-bold text-blue-700 shadow-sm">
                                              Notes{" "}
                                              {
                                                (
                                                  notesByApplicant[
                                                    applicant._id
                                                  ] ||
                                                  []
                                                ).filter(
                                                  item =>
                                                    item.kind !==
                                                    "task"
                                                ).length
                                              }
                                            </span>

                                            <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-bold text-indigo-700 shadow-sm">
                                              Tasks{" "}
                                              {
                                                (
                                                  notesByApplicant[
                                                    applicant._id
                                                  ] ||
                                                  []
                                                ).filter(
                                                  item =>
                                                    item.kind ===
                                                    "task"
                                                ).length
                                              }
                                            </span>

                                            {(
                                              notesByApplicant[
                                                applicant._id
                                              ] ||
                                              []
                                            ).some(
                                              item =>
                                                item.important
                                            ) && (
                                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-700">
                                                <Flag className="h-2.5 w-2.5" />
                                                Important
                                              </span>
                                            )}
                                          </div>
                                        )}


                                        <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
                                          {(
                                            notesByApplicant[
                                              applicant._id
                                            ] ||
                                            []
                                          ).length === 0 ? (
                                            <p className="rounded-md border border-dashed border-slate-200 bg-white p-2 text-[9px] text-slate-400">
                                              No internal notes or tasks yet.
                                            </p>
                                          ) : (
                                            (
                                              notesByApplicant[
                                                applicant._id
                                              ] ||
                                              []
                                            )
                                              .slice(
                                                0,
                                                4
                                              )
                                              .map(
                                                note => (
                                                  <div
                                                    key={
                                                      note._id
                                                    }
                                                    className={
                                                      `rounded-md border bg-white p-2 shadow-sm ${
                                                        note.important
                                                          ? "border-amber-200"
                                                          : "border-transparent"
                                                      }`
                                                    }
                                                  >
                                                    <div className="flex flex-wrap items-center gap-1">
                                                      <span
                                                        className={
                                                          `rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase ${
                                                            note.kind ===
                                                            "task"
                                                              ? "bg-indigo-100 text-indigo-700"
                                                              : "bg-blue-100 text-blue-700"
                                                          }`
                                                        }
                                                      >
                                                        {note.kind ===
                                                        "task"
                                                          ? "Task"
                                                          : "Note"}
                                                      </span>

                                                      {note.important && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[7px] font-bold text-amber-700">
                                                          <Flag className="h-2 w-2" />
                                                          Important
                                                        </span>
                                                      )}

                                                      {note.kind ===
                                                        "task" && (
                                                        <>
                                                          <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[7px] font-bold text-indigo-700">
                                                            {pipelineTaskStatusLabel(
                                                              note.taskStatus
                                                            )}
                                                          </span>

                                                          {note.priority && (
                                                            <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[7px] font-bold text-rose-700">
                                                              {pipelineTaskPriorityLabel(
                                                                note.priority
                                                              )}
                                                            </span>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>


                                                    <p className="mt-1 whitespace-pre-wrap break-words text-[9px] leading-4 text-slate-700">
                                                      {
                                                        note.content
                                                      }
                                                    </p>


                                                    {(note.schedule
                                                      ?.endAt ||
                                                      note.schedule
                                                        ?.reminderAt) && (
                                                      <div className="mt-1 flex flex-wrap gap-1 text-[7px] font-semibold">
                                                        {note.schedule
                                                          ?.endAt && (
                                                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
                                                            Due{" "}
                                                            {
                                                              formatDate(
                                                                note
                                                                  .schedule
                                                                  .endAt
                                                              )
                                                            }
                                                          </span>
                                                        )}

                                                        {note.schedule
                                                          ?.reminderAt && (
                                                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
                                                            Reminder{" "}
                                                            {
                                                              formatDate(
                                                                note
                                                                  .schedule
                                                                  .reminderAt
                                                              )
                                                            }
                                                          </span>
                                                        )}
                                                      </div>
                                                    )}


                                                    <p className="mt-1 truncate text-[8px] text-slate-400">
                                                      {note.kind ===
                                                      "task"
                                                        ? `Assigned: ${
                                                            note.assignee
                                                              ?.name ||
                                                            note.assignee
                                                              ?.email ||
                                                            "Unassigned"
                                                          }`
                                                        : (
                                                            note.author
                                                              ?.name ||
                                                            note.author
                                                              ?.email ||
                                                            "Administrator"
                                                          )}
                                                    </p>
                                                  </div>
                                                )
                                              )
                                          )}
                                        </div>


                                        {!applicant
                                          .lifecycle
                                          .archived && (
                                          <div className="mt-2 rounded-md border border-blue-100 bg-white p-2">
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                              <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                                                Quick Add
                                              </p>

                                              <select
                                                value={
                                                  quickKindByApplicant[
                                                    applicant._id
                                                  ] ||
                                                  "note"
                                                }
                                                disabled={
                                                  noteSavingApplicantId ===
                                                  applicant._id
                                                }
                                                onChange={(
                                                  event
                                                ) =>
                                                  setQuickKindByApplicant(
                                                    current => ({
                                                      ...current,

                                                      [applicant._id]:
                                                        event
                                                          .target
                                                          .value as
                                                          ApplicantInternalNoteKind,
                                                    })
                                                  )
                                                }
                                                className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[8px] font-semibold text-slate-600"
                                              >
                                                <option value="note">
                                                  Quick Note
                                                </option>

                                                <option value="task">
                                                  Quick Task
                                                </option>
                                              </select>
                                            </div>

                                            <textarea
                                              value={
                                                quickNoteByApplicant[
                                                  applicant._id
                                                ] ||
                                                ""
                                              }
                                              maxLength={
                                                4000
                                              }
                                              rows={
                                                2
                                              }
                                              disabled={
                                                noteSavingApplicantId ===
                                                applicant._id
                                              }
                                              placeholder={
                                                (
                                                  quickKindByApplicant[
                                                    applicant._id
                                                  ] ||
                                                  "note"
                                                ) ===
                                                "task"
                                                  ? "Add a quick internal task..."
                                                  : "Add a quick internal note..."
                                              }
                                              onChange={(
                                                event
                                              ) =>
                                                setQuickNoteByApplicant(
                                                  current => ({
                                                    ...current,

                                                    [applicant._id]:
                                                      event
                                                        .target
                                                        .value,
                                                  })
                                                )
                                              }
                                              className="w-full resize-none rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] outline-none focus:border-blue-300"
                                            />

                                            <button
                                              type="button"
                                              disabled={
                                                noteSavingApplicantId ===
                                                  applicant._id ||
                                                !(
                                                  quickNoteByApplicant[
                                                    applicant._id
                                                  ] ||
                                                  ""
                                                ).trim()
                                              }
                                              onClick={() =>
                                                void addQuickInternalNote(
                                                  applicant
                                                )
                                              }
                                              className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-[9px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                                            >
                                              {noteSavingApplicantId ===
                                              applicant._id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <Plus className="h-3 w-3" />
                                              )}

                                              Add{" "}
                                              {(
                                                quickKindByApplicant[
                                                  applicant._id
                                                ] ||
                                                "note"
                                              ) ===
                                              "task"
                                                ? "Task"
                                                : "Note"}
                                            </button>
                                          </div>
                                        )}


                                        {(
                                          notesByApplicant[
                                            applicant._id
                                          ] ||
                                          []
                                        ).length > 4 && (
                                          <p className="mt-2 text-center text-[8px] font-semibold text-blue-600">
                                            +
                                            {
                                              (
                                                notesByApplicant[
                                                  applicant._id
                                                ] ||
                                                []
                                              ).length -
                                              4
                                            }{" "}
                                            more in full profile
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}


                                <div className="mt-3 flex items-center gap-2">
                                  <select
                                    aria-label={
                                      `Move ${
                                        applicant
                                          .identity
                                          .fullName
                                      }`
                                    }
                                    disabled={
                                      moving ||
                                      applicant
                                        .lifecycle
                                        .archived
                                    }
                                    value={
                                      currentStatus
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      void moveApplicant(
                                        applicant,
                                        event
                                          .target
                                          .value as
                                          ApplicantStatus
                                      )
                                    }
                                    className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold disabled:bg-slate-100"
                                  >
                                    <option
                                      value={
                                        currentStatus
                                      }
                                    >
                                      {
                                        stageLabel(
                                          pipeline,
                                          currentStatus
                                        )
                                      }
                                    </option>

                                    {
                                      transitions.map(
                                        (
                                          status
                                        ) => (
                                          <option
                                            key={
                                              status
                                            }
                                            value={
                                              status
                                            }
                                          >
                                            {
                                              stageLabel(
                                                pipeline,
                                                status
                                              )
                                            }
                                          </option>
                                        )
                                      )
                                    }
                                  </select>

                                  <button
                                    type="button"
                                    title="View Applicant"
                                    onClick={() =>
                                      onOpenApplicant(
                                        applicant
                                      )
                                    }
                                    className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </div>


                                {moving && (
                                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-blue-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Moving...
                                  </div>
                                )}
                              </article>
                            );
                          }
                        )
                      )
                    }
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}
