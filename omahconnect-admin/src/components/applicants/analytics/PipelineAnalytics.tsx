import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";

import {
  EmptyState,
  MatrixTable,
  Panel,
  formatDateTime,
} from "./AnalyticsShared";


export function PipelineAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const pipeline =
    analytics.pipelineAnalytics;

  const flow =
    pipeline.recordedFlow;


  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {pipeline.stages.map(
          stage => (
            <article
              key={
                stage.status
              }
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {
                  stage.label
                }
              </p>

              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {
                    stage.count
                  }
                </span>

                <span className="text-[10px] font-semibold text-slate-400">
                  {
                    stage.percent
                  }%
                </span>
              </div>
            </article>
          )
        )}
      </div>


      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Current Pipeline Funnel"
          subtitle="A current-state funnel showing how many Applicants presently occupy each stage. This is not a historical conversion funnel."
        >
          <div className="space-y-2">
            {pipeline.funnel.map(
              stage => (
                <div
                  key={
                    stage.status
                  }
                  className="flex justify-center"
                >
                  <div
                    className="flex min-h-10 items-center justify-between rounded-lg bg-blue-600 px-4 text-white"
                    style={{
                      width:
                        `${Math.max(
                          20,
                          stage.relativeWidth
                        )}%`,
                    }}
                  >
                    <span className="truncate text-[10px] font-semibold">
                      {
                        stage.label
                      }
                    </span>

                    <span className="ml-3 text-xs font-bold">
                      {
                        stage.count
                      }
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </Panel>


        <Panel
          title="Stage Distribution"
          subtitle="Controlled seven-stage recruitment pipeline distribution."
        >
          <div className="h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  pipeline.stages
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


      <Panel
        title="Recorded Recruitment Movements"
        subtitle="Sankey flow built from audited status.changed events. Coverage is partial because historical Applicants predate the activity log."
      >
        {flow.recordedTransitions ===
        0 ? (
          <EmptyState text="No recorded status transitions are available for the current cohort." />
        ) : (
          <>
            <div className="h-[360px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <Sankey
                  data={{
                    nodes:
                      flow.nodes.map(
                        node => ({
                          name:
                            node.name,
                        })
                      ),

                    links:
                      flow.links.map(
                        link => ({
                          source:
                            link.source,

                          target:
                            link.target,

                          value:
                            link.value,
                        })
                      ),
                  }}
                  nodePadding={
                    26
                  }
                  nodeWidth={
                    12
                  }
                >
                  <Tooltip />
                </Sankey>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-slate-400">
              <span>
                Recorded transitions:{" "}
                <strong className="text-slate-600">
                  {
                    flow.recordedTransitions
                  }
                </strong>
              </span>

              <span>
                First recorded:{" "}
                <strong className="text-slate-600">
                  {formatDateTime(
                    flow.firstRecordedAt
                  )}
                </strong>
              </span>

              <span>
                Last recorded:{" "}
                <strong className="text-slate-600">
                  {formatDateTime(
                    flow.lastRecordedAt
                  )}
                </strong>
              </span>
            </div>
          </>
        )}
      </Panel>


      <div className="grid gap-5 2xl:grid-cols-2">
        <Panel
          title="Position Track × Pipeline Stage"
          subtitle="Heatmap showing where each recruitment track is currently concentrated."
        >
          <MatrixTable
            rows={
              pipeline.positionByStage
            }
            stages={
              pipeline.stages
            }
          />
        </Panel>


        <Panel
          title="Applicant Source × Pipeline Stage"
          subtitle="Current stage distribution by recruitment source."
        >
          <MatrixTable
            rows={
              pipeline.sourceByStage
            }
            stages={
              pipeline.stages
            }
          />
        </Panel>
      </div>


      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[10px] leading-4 text-blue-700">
        Historical time-in-stage, historical conversion rates, and time-to-hire are intentionally not displayed because legacy Applicants do not have complete status-transition audit history.
      </div>
    </div>
  );
}
