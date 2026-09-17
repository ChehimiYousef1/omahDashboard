import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import {
  fetchApplicantAnalytics,
  type ApplicantRecruitmentAnalytics,
  type ApplicantSearchQuery,
  type ApplicantAnalyticsDrilldownType,
} from "../../services/api";

import {
  AnalyticsOverview,
} from "./analytics/AnalyticsOverview";

import {
  ApplicantAnalyticsFilters,
} from "./analytics/ApplicantAnalyticsFilters";

import {
  PipelineAnalytics,
} from "./analytics/PipelineAnalytics";

import {
  EvaluationAnalytics,
} from "./analytics/EvaluationAnalytics";

import {
  InterviewAnalytics,
} from "./analytics/InterviewAnalytics";

import {
  NotesTasksAnalytics,
} from "./analytics/NotesTasksAnalytics";

import {
  ManagementAnalytics,
} from "./analytics/ManagementAnalytics";

import {
  SegmentationAnalytics,
} from "./analytics/SegmentationAnalytics";

import {
  ActivityAnalytics,
} from "./analytics/ActivityAnalytics";

import {
  DataQualityAnalytics,
} from "./analytics/DataQualityAnalytics";

import {
  DocumentAnalytics,
} from "./analytics/DocumentAnalytics";

import {
  SubmissionAnalytics,
} from "./analytics/SubmissionAnalytics";

import {
  CommunicationAnalytics,
} from "./analytics/CommunicationAnalytics";

import {
  ApplicantAnalyticsDrilldownPanel,
} from "./analytics/ApplicantAnalyticsDrilldownPanel";


interface ApplicantAnalyticsDashboardProps {
  filters:
    ApplicantSearchQuery;

  onViewApplicants?: (
    filterPatch:
      Partial<ApplicantSearchQuery>
  ) => void;

  onOpenDuplicateReview?: () => void;

  onOpenApplicant?: (
    applicantId: string
  ) =>
    void |
    Promise<void>;
}


type AnalyticsTab =
  | "overview"
  | "pipeline"
  | "evaluations"
  | "interviews"
  | "notesTasks"
  | "management"
  | "segmentation"
  | "activity"
  | "dataQuality"
  | "documents"
  | "submissions"
  | "communications";


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
      response?.data?.error
    ) {
      return response
        .data
        .error;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unable to load Applicant analytics.";
}


export function ApplicantAnalyticsDashboard({
  filters,
  onViewApplicants,
  onOpenDuplicateReview,
  onOpenApplicant,
}: ApplicantAnalyticsDashboardProps) {
  const [
    analytics,
    setAnalytics,
  ] = useState<
    ApplicantRecruitmentAnalytics |
    null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string |
    null
  >(null);

  const [
    activeTab,
    setActiveTab,
  ] = useState<
    AnalyticsTab
  >("overview");

  const [
    drilldownType,
    setDrilldownType,
  ] = useState<
    ApplicantAnalyticsDrilldownType |
    null
  >(null);


  const loadAnalytics =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            null
          );

          const result =
            await fetchApplicantAnalytics(
              filters
            );

          setAnalytics(
            result
          );
        } catch (err) {
          setError(
            errorMessage(
              err
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [filters]
    );


  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);


  if (
    loading &&
    !analytics
  ) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />

          <p className="mt-3 text-xs text-slate-500">
            Loading Applicant management analytics...
          </p>
        </div>
      </div>
    );
  }


  if (
    error &&
    !analytics
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        <p className="text-sm font-bold">
          Applicant analytics could not be loaded
        </p>

        <p className="mt-2 text-xs">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            void loadAnalytics()
          }
          className="mt-4 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }


  if (!analytics) {
    return null;
  }


  const tabs = [
    {
      id:
        "overview" as const,

      label:
        "Overview",

      icon:
        BarChart3,
    },

    {
      id:
        "pipeline" as const,

      label:
        "Pipeline",

      icon:
        Activity,
    },

    {
      id:
        "evaluations" as const,

      label:
        "Evaluations",

      icon:
        ClipboardCheck,
    },

    {
      id:
        "interviews" as const,

      label:
        "Interviews",

      icon:
        Users,
    },

    {
      id:
        "notesTasks" as const,

      label:
        "Notes & Tasks",

      icon:
        ClipboardCheck,
    },

    {
      id:
        "management" as const,

      label:
        "Management",

      icon:
        BriefcaseBusiness,
    },

    {
      id:
        "segmentation" as const,

      label:
        "Segmentation",

      icon:
        SlidersHorizontal,
    },

    {
      id:
        "activity" as const,

      label:
        "Activity",

      icon:
        Activity,
    },

    {
      id:
        "dataQuality" as const,

      label:
        "Data Quality",

      icon:
        ClipboardCheck,
    },

    {
      id:
        "documents" as const,

      label:
        "Documents",

      icon:
        BriefcaseBusiness,
    },

    {
      id:
        "submissions" as const,

      label:
        "Submissions",

      icon:
        BarChart3,
    },

    {
      id:
        "communications" as const,

      label:
        "Communications",

      icon:
        Users,
    },
  ];


  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />

              <h3 className="text-base font-bold text-slate-900">
                Applicant Management Analytics
              </h3>
            </div>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Recruitment intelligence across Applicants, pipeline stages, evaluations, interviews, internal Notes/Tasks, duplicate review, submissions, documents, communications, activity, education, geography, and skills.
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Analytics version{" "}
              {
                analytics.analyticsVersion
              }
              {" · "}
              {
                analytics.summary
                  .totalApplicants
              }
              {" Applicants in current cohort"}
            </p>
          </div>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={() =>
              void loadAnalytics()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
      </div>


      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Latest refresh failed:{" "}
          {error}
        </div>
      )}


      <ApplicantAnalyticsFilters
        analytics={
          analytics
        }
      />


      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map(
            tab => {
              const Icon =
                tab.icon;

              const selected =
                activeTab ===
                tab.id;

              return (
                <button
                  key={
                    tab.id
                  }
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.id
                    )
                  }
                  className={
                    `inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                      selected
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />

                  {
                    tab.label
                  }
                </button>
              );
            }
          )}
        </div>
      </div>


      {activeTab ===
        "overview" && (
        <AnalyticsOverview
          analytics={
            analytics
          }

          onNavigateTab={
            tab =>
              setActiveTab(
                tab
              )
          }

          onViewApplicants={
            onViewApplicants
          }

          onOpenDuplicateReview={
            onOpenDuplicateReview
          }
        
          onOpenDrilldown={
            setDrilldownType
          }
        />
      )}

      {activeTab ===
        "pipeline" && (
        <PipelineAnalytics
          analytics={
            analytics
          }
        />
      )}

      {activeTab ===
        "evaluations" && (
        <EvaluationAnalytics
          analytics={
            analytics
          }
        />
      )}

      {activeTab ===
        "interviews" && (
        <InterviewAnalytics
          analytics={
            analytics
          }
        />
      )}

      {activeTab ===
        "notesTasks" && (
        <NotesTasksAnalytics
          analytics={
            analytics
          }

          onOpenDrilldown={
            setDrilldownType
          }
        />
      )}

      {activeTab ===
        "management" && (
        <ManagementAnalytics
          analytics={
            analytics
          }

          onViewApplicants={
            onViewApplicants
          }

          onOpenDuplicateReview={
            onOpenDuplicateReview
          }
        
          onOpenDrilldown={
            setDrilldownType
          }
        />
      )}

      {activeTab ===
        "segmentation" && (
        <SegmentationAnalytics
          analytics={
            analytics
          }
        />
      )}

      {activeTab ===
        "activity" && (
        <ActivityAnalytics
          analytics={
            analytics
          }
        />
      )}

      {activeTab ===
        "dataQuality" && (
        <DataQualityAnalytics
          analytics={
            analytics
          }
        />
      )}

      {activeTab ===
        "documents" && (
        <DocumentAnalytics
          analytics={
            analytics
          }

          filters={
            filters
          }

          onOpenApplicant={
            onOpenApplicant
          }

          onDocumentsChanged={
            loadAnalytics
          }
        />
      )}

      {activeTab ===
        "submissions" && (
        <SubmissionAnalytics
          analytics={
            analytics
          }
        />
      )}

      {activeTab ===
        "communications" && (
        <CommunicationAnalytics
          analytics={
            analytics
          }
        />
      )}


      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[10px] leading-4 text-blue-700">
        Historical time-in-stage and full historical conversion metrics remain intentionally excluded because legacy Applicants do not have complete status-transition audit history. Current pipeline, recorded movements, management priorities, evaluation, interview, internal Notes/Tasks, communication, document, submission, and segmentation analytics use stored verifiable records only.
      </div>


      {drilldownType && (
        <ApplicantAnalyticsDrilldownPanel
          type={
            drilldownType
          }

          filters={
            filters
          }

          onClose={() =>
            setDrilldownType(
              null
            )
          }

          onOpenApplicant={
            async applicantId => {
              setDrilldownType(
                null
              );

              await onOpenApplicant?.(
                applicantId
              );
            }
          }
        />
      )}
    </section>
  );
}
