import { useEffect, useMemo, useState } from "react";
import {
  fetchApplications,
  updateApplicationStatus,
  deleteApplication,
  syncApplicantsSheet,
  type Application,
} from "../services/api";
import { Header } from "../components/layout/Header";
import { ApplicantProfilePanel } from "../components/applicants/ApplicantProfilePanel";
import {
  Search,
  Eye,
  Download,
  Calendar,
  FileText,
  Mail,
  Trash2,
  RefreshCw,
  Phone,
  Loader2,
} from "lucide-react";

interface ApplicationsPageProps {
  onTriggerEmail?: (recipientId: string, campaignType: string, recipientType: "direct" | "applicant" | "bulk") => void;
}

export function ApplicationsPage({ onTriggerEmail }: ApplicationsPageProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const loadApps = async (withSync = false) => {
    try {
      setLoading(true);
      setError(null);

      if (withSync) {
        try {
          setSyncing(true);
          const result = await syncApplicantsSheet();
          if (result.addedCount > 0) {
            setSyncMessage(`Imported ${result.addedCount} new applicant(s) from the sheet.`);
          } else {
            setSyncMessage("Sheet is up to date — no new applicants to import.");
          }
        } catch (err: unknown) {
          const message =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
              : null;
          setSyncMessage(
            message ||
              "Could not sync from Google Sheet. Publish the sheet to the web as CSV (File → Share → Publish to web)."
          );
        } finally {
          setSyncing(false);
        }
      }

      const data = await fetchApplications();
      setApplications(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load applicants";
      setError(
        `${message}. Make sure the backend is running: open a terminal in the project folder and run "npm start".`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial applicant synchronization intentionally loads remote data
    // when the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApps(true);
  }, []);

  const handleUpdateStatus = async (
    id: string,
    nextStatus: "applied" | "reviewed" | "interview" | "hired" | "rejected"
  ) => {
    try {
      await updateApplicationStatus(id, nextStatus);
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: nextStatus } : app))
      );
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch {
      alert("Failed to update applicant status");
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!window.confirm("Delete this applicant record? This cannot be undone.")) return;
    try {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
      setSelectedApp(null);
    } catch {
      alert("Failed to delete applicant record.");
    }
  };

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        app.userName.toLowerCase().includes(q) ||
        app.userEmail.toLowerCase().includes(q) ||
        (app.phone || "").toLowerCase().includes(q) ||
        app.jobTitle.toLowerCase().includes(q) ||
        app.companyName.toLowerCase().includes(q) ||
        (app.education || "").toLowerCase().includes(q) ||
        (app.skills || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "All" || app.status === statusFilter;

      const appDate = new Date(app.appliedDate);
      const now = new Date();
      let matchesDate = true;
      if (dateFilter === "7d") {
        matchesDate = now.getTime() - appDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === "30d") {
        matchesDate = now.getTime() - appDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
      }

      return matchesQuery && matchesStatus && matchesDate;
    });
  }, [applications, searchQuery, statusFilter, dateFilter]);

  if (loading && applications.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-12 text-center text-red-600">
        <FileText className="h-10 w-10 text-red-500" />
        <p className="mt-3 font-semibold">Error Loading Applicants</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Applicants" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          All applicants synced from your Google Sheet responses.
          {applications.length > 0 && (
            <span className="ml-2 font-semibold text-slate-700">({applications.length} total)</span>
          )}
        </p>
        <button
          onClick={() => loadApps(true)}
          disabled={syncing || loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Refresh from Sheet"}
        </button>
      </div>

      {syncMessage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-800">
          {syncMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search name, email, phone, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Stages</option>
            <option value="applied">Applied</option>
            <option value="reviewed">Reviewed</option>
            <option value="interview">Interview</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450">
              <th className="px-5 py-3.5">Applicant</th>
              <th className="px-5 py-3.5">Phone</th>
              <th className="px-5 py-3.5">Role / Position</th>
              <th className="px-5 py-3.5">Education</th>
              <th className="px-5 py-3.5">Date Applied</th>
              <th className="px-5 py-3.5 text-center">Resume</th>
              <th className="px-5 py-3.5">Stage</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredApps.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  {applications.length === 0
                    ? "No applicants yet. Click Refresh from Sheet after publishing your Google Sheet as CSV."
                    : "No applicants match the filters."}
                </td>
              </tr>
            ) : (
              filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-800">{app.userName}</span>
                    <span className="block text-[10px] text-slate-400">{app.userEmail}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {app.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {app.phone}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-800">{app.jobTitle}</span>
                    <span className="block text-[10px] text-blue-600">{app.companyName}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 max-w-[140px] truncate" title={app.education}>
                    {app.education || "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {app.appliedDate}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {app.resumeUrl ? (
                      <a
                        href={app.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 font-bold text-blue-600 hover:text-blue-500"
                      >
                        <Download className="h-3.5 w-3.5" /> View
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={app.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          app.id,
                          e.target.value as "applied" | "reviewed" | "interview" | "hired" | "rejected"
                        )
                      }
                      className={`rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold focus:outline-none ${
                        app.status === "hired"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : app.status === "rejected"
                          ? "text-rose-700 bg-rose-50 border-rose-200"
                          : app.status === "interview"
                          ? "text-blue-700 bg-blue-50 border-blue-200"
                          : "text-slate-700 bg-slate-50"
                      }`}
                    >
                      <option value="applied">Applied</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="interview">Interview</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onTriggerEmail && (
                        <button
                          type="button"
                          onClick={() => onTriggerEmail(app.id, 'direct', 'applicant')}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          title="Send Email"
                        >
                          <Mail className="h-4.5 w-4.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        title="View all details"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteApp(app.id)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedApp && (
        <ApplicantProfilePanel
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onTriggerEmail={onTriggerEmail}
        />
      )}
    </div>
  );
}
