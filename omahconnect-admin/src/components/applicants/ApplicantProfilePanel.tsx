import { useState } from "react";
import {
  FileText,
  Mail,
  Phone,
  X,
} from "lucide-react";

import type { Application } from "../../services/api";

type ProfileTab =
  | "overview"
  | "current-profile"
  | "submissions"
  | "documents"
  | "evaluations"
  | "interviews"
  | "communications"
  | "notes"
  | "activity";

interface ApplicantProfilePanelProps {
  application: Application;
  onClose: () => void;
}

const tabs: Array<{
  id: ProfileTab;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "current-profile", label: "Current Profile" },
  { id: "submissions", label: "Submissions" },
  { id: "documents", label: "Documents" },
  { id: "evaluations", label: "Evaluations" },
  { id: "interviews", label: "Interviews" },
  { id: "communications", label: "Communications" },
  { id: "notes", label: "Notes / Tasks" },
  { id: "activity", label: "Activity" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ApplicantProfilePanel({
  application,
  onClose,
}: ApplicantProfilePanelProps) {
  const [activeTab, setActiveTab] =
    useState<ProfileTab>("overview");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs">
      <div className="ml-auto flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                {initials(application.userName) || "AP"}
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {application.userName}
                </h2>

                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {application.userEmail}
                  </span>

                  {application.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {application.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              aria-label="Close applicant profile"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <nav className="overflow-x-auto border-b border-slate-200 bg-white px-6">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-3 py-3 text-[11px] font-bold ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" ? (
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Applicant Overview
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ProfileField
                  label="Position"
                  value={application.jobTitle}
                />

                <ProfileField
                  label="Company"
                  value={application.companyName}
                />

                <ProfileField
                  label="Applied Date"
                  value={application.appliedDate}
                />

                <ProfileField
                  label="Status"
                  value={application.status}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />

              <h3 className="mt-3 text-sm font-bold text-slate-800">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                This section is ready for its dedicated Applicant data integration.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="mt-1 block text-xs font-semibold text-slate-800">
        {value || "—"}
      </span>
    </div>
  );
}
