import {
  CircleCheckBig,
  CircleX,
  Eye,
  Gift,
  MessagesSquare,
  Star,
  UserPlus,
  Users,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";


interface Metric {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
}


export function AnalyticsKpiCards({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const summary =
    analytics.summary;

  const metrics:
    Metric[] = [
      {
        label:
          "Applicants",

        value:
          summary.totalApplicants,

        description:
          "Current filtered Applicant cohort",

        icon:
          Users,
      },

      {
        label:
          "New",

        value:
          summary.newApplicants,

        description:
          "New Applicants awaiting recruitment progress",

        icon:
          UserPlus,
      },

      {
        label:
          "Under Review",

        value:
          summary.underReview,

        description:
          "Applicants currently being reviewed",

        icon:
          Eye,
      },

      {
        label:
          "Shortlisted",

        value:
          summary.shortlisted,

        description:
          "Applicants currently shortlisted",

        icon:
          Star,
      },

      {
        label:
          "Interview",

        value:
          summary.interviewStage,

        description:
          "Applicants currently at Interview stage",

        icon:
          MessagesSquare,
      },

      {
        label:
          "Offered",

        value:
          summary.offered,

        description:
          "Applicants currently at Offered stage",

        icon:
          Gift,
      },

      {
        label:
          "Hired",

        value:
          summary.hired,

        description:
          "Applicants currently hired",

        icon:
          CircleCheckBig,
      },

      {
        label:
          "Rejected",

        value:
          summary.rejected,

        description:
          "Applicants currently rejected",

        icon:
          CircleX,
      },
    ];


  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
      {metrics.map(
        metric => {
          const Icon =
            metric.icon;

          return (
            <article
              key={
                metric.label
              }
              className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {
                      metric.label
                    }
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {
                      metric.value
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <p className="mt-2 text-[9px] leading-4 text-slate-400">
                {
                  metric.description
                }
              </p>
            </article>
          );
        }
      )}
    </div>
  );
}
