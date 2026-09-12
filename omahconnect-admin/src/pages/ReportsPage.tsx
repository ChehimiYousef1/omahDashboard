import { useEffect, useMemo, useState } from "react";
import {
  fetchCompanyReports,
  resolveCompanyReport,
  suspendCompany,
  updateJobStatus,
  type CompanyReport,
} from "../services/api";
import { Header } from "../components/layout/Header";
import { Search, Eye, Calendar, Flag, Check, X, AlertTriangle } from "lucide-react";

export function ReportsPage() {
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [targetTypeFilter, setTargetTypeFilter] = useState("All");
  const [reasonFilter, setReasonFilter] = useState("All");

  // Selected Report for Modal View
  const [selectedReport, setSelectedReport] = useState<CompanyReport | null>(null);
  useEffect(() => {
    let active = true;

    void fetchCompanyReports()
      .then((data) => {
        if (active) {
          setReports(data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load reports log"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);


  const handleResolve = async (id: string) => {
    try {
      await resolveCompanyReport(id);
      setReports((prev) =>
        prev.map((rep) => (rep.id === id ? { ...rep, status: "resolved" } : rep))
      );
      if (selectedReport && selectedReport.id === id) {
        setSelectedReport((prev) => prev ? { ...prev, status: "resolved" } : null);
      }
      alert("Report ticket resolved successfully.");
    } catch {
      alert("Failed to resolve report ticket");
    }
  };

  const handleTakeAction = async (report: CompanyReport) => {
    try {
      if (report.targetType === "company") {
        if (window.confirm(`Are you sure you want to suspend company [${report.targetName}]? Recruiters and job posts will be disabled.`)) {
          await suspendCompany(report.targetId, true);
          alert("Company suspended successfully.");
        }
      } else {
        if (window.confirm(`Are you sure you want to expire job posting [${report.targetName}]?`)) {
          await updateJobStatus(report.targetId, "expired");
          alert("Job posting deactivated successfully.");
        }
      }
      await handleResolve(report.id);
    } catch {
      alert("Failed to take disciplinary actions.");
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const matchesQuery =
        rep.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.reportedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || rep.status === statusFilter;
      const matchesTargetType = targetTypeFilter === "All" || rep.targetType === targetTypeFilter;
      const matchesReason = reasonFilter === "All" || rep.reason === reasonFilter;
      return matchesQuery && matchesStatus && matchesTargetType && matchesReason;
    });
  }, [reports, searchQuery, statusFilter, targetTypeFilter, reasonFilter]);

  if (loading && reports.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-12 text-center text-red-600">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="mt-3 font-semibold">Error Loading Reports</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header title="Moderator Complaints Center" />

      {/* Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Review, dismiss, or apply platform penalties on reported job listings, companies, and profiles.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 text-emerald-600 font-semibold text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          INCIDENTS ACTIVE
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search ticket ID, target, reporter, reason..."
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
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none text-capitalize"
          >
            <option value="All">All Target Types</option>
            <option value="company">Company</option>
            <option value="job">Job</option>
          </select>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="All">All Reasons</option>
            <option value="Spam">Spam</option>
            <option value="Scam">Scam</option>
            <option value="Misleading Info">Misleading Info</option>
            <option value="Inappropriate">Inappropriate</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450">
              <th className="px-5 py-3.5">Reason</th>
              <th className="px-5 py-3.5">Target Type</th>
              <th className="px-5 py-3.5">Target Name</th>
              <th className="px-5 py-3.5">Reported By</th>
              <th className="px-5 py-3.5">Date Reported</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No reports logged.
                </td>
              </tr>
            ) : (
              filteredReports.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                      {rep.reason}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-650 capitalize">{rep.targetType}</td>
                  <td className="px-5 py-4 font-semibold text-blue-600 truncate max-w-[150px]">{rep.targetName}</td>
                  <td className="px-5 py-4 text-slate-500 truncate max-w-[200px]">{rep.reportedBy}</td>
                  <td className="px-5 py-4 text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {rep.createdDate}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      rep.status === "pending"
                        ? "bg-amber-50 text-amber-700 animate-pulse"
                        : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {rep.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(rep)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        title="View Details"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                      {rep.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResolve(rep.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                            title="Dismiss Report"
                          >
                            <Check className="h-4.5 w-4.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTakeAction(rep)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-550 hover:text-white"
                            title="Apply Penalty & Resolve"
                          >
                            <X className="h-4.5 w-4.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REPORT COMPLAINT DETAILS MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-slate-800">Complaint Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-650">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">{selectedReport.reason}</span>
                <span>•</span>
                <span>Ticket ID: {selectedReport.id}</span>
                <span>•</span>
                <span>{selectedReport.createdDate}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Target Category:</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedReport.targetType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Target Name:</span>
                  <span className="font-semibold text-blue-600">{selectedReport.targetName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-0.5">Reported By:</span>
                  <span className="font-semibold text-slate-850">{selectedReport.reportedBy}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-850 mb-1">Detailed Description</h4>
                <p className="leading-relaxed text-slate-600 bg-slate-50/35 border border-slate-150 p-3 rounded-lg">
                  {selectedReport.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-bold pt-3 border-t border-slate-100">
              {selectedReport.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTakeAction(selectedReport)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-550"
                  >
                    Take Action & Suspend/Expire
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleResolve(selectedReport.id);
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-550"
                  >
                    Dismiss & Resolve
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-650 hover:bg-slate-50"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
