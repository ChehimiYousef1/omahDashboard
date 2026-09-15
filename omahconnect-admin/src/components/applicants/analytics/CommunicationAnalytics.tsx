import {
  Mail,
  MessageCircle,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ApplicantRecruitmentAnalytics,
} from "../../../services/api";

import {
  EmptyState,
  Panel,
  formatDateTime,
} from "./AnalyticsShared";


export function CommunicationAnalytics({
  analytics,
}: {
  analytics:
    ApplicantRecruitmentAnalytics;
}) {
  const communication =
    analytics.management
      .communications;


  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Successful Communications
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {
              communication.total
            }
          </p>
        </article>

        <article className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
          <Mail className="h-4 w-4 text-blue-600" />

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {
              communication.emailSent
            }
          </p>

          <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-500">
            Emails Sent
          </p>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
          <MessageCircle className="h-4 w-4 text-emerald-600" />

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {
              communication
                .whatsappSent
            }
          </p>

          <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-500">
            WhatsApp Sent
          </p>
        </article>
      </div>


      <Panel
        title="Communication Trend"
        subtitle="Successful Applicant communication activity recorded by the audit log."
      >
        {communication.trend.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  communication.trend
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="period"
                  tick={{
                    fontSize: 10,
                  }}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 10,
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="email"
                  stackId="communications"
                  fill="#2563eb"
                  name="Email"
                />

                <Bar
                  dataKey="whatsapp"
                  stackId="communications"
                  fill="#16a34a"
                  name="WhatsApp"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>


      <Panel
        title="Recent Communications"
        subtitle="Only successful sends recorded in Applicant Activity are shown."
      >
        {communication.recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-2 pr-4">
                    Channel
                  </th>

                  <th className="pb-2 pr-4">
                    Subject / Provider
                  </th>

                  <th className="pb-2 pr-4">
                    Actor
                  </th>

                  <th className="pb-2">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {communication.recent.map(
                  item => (
                    <tr
                      key={
                        item.id
                      }
                      className="border-b border-slate-50"
                    >
                      <td className="py-3 pr-4 font-semibold text-slate-700">
                        {
                          item.type ===
                          "communication.email.sent"
                            ? "Email"
                            : "WhatsApp"
                        }
                      </td>

                      <td className="py-3 pr-4 text-slate-500">
                        {
                          item.subject ||
                          item.provider ||
                          "—"
                        }
                      </td>

                      <td className="py-3 pr-4 text-slate-500">
                        {
                          item.actor.name ||
                          "—"
                        }
                      </td>

                      <td className="py-3 text-slate-500">
                        {formatDateTime(
                          item.occurredAt
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>


      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[10px] leading-4 text-slate-600">
        WhatsApp analytics may remain zero while the live WhatsApp Business provider is disabled. No communication is triggered from this analytics screen.
      </div>
    </div>
  );
}
