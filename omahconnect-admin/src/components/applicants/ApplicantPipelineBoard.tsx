import {
  useMemo,
  useState,
  type DragEvent,
} from "react";

import {
  Eye,
  GripVertical,
  Loader2,
  Users,
} from "lucide-react";

import type {
  ApplicantMaster,
  ApplicantPipelineDefinition,
  ApplicantPipelineStage,
  ApplicantStatus,
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
        <div className="grid min-w-[1960px] grid-cols-7 gap-3">
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
