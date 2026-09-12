import { useEffect, useMemo, useState } from "react";
import {
  fetchCompanies,
  fetchCompanyRecruiters,
  fetchCompanyJobs,
  fetchCompanyReports,
  fetchCompanyLogs,
  fetchCompanySettings,
  saveCompanySettings,
  verifyCompany,
  suspendCompany,
  sendRecruiterCampaign,
  toggleJobFeature,
  updateJobStatus,
  resolveCompanyReport,
  type Company,
  type Job,
  type CompanyReport,
  type CompanyLog,
  type CompanySettings,
  type User,
} from "../services/api";
import { Header } from "../components/layout/Header";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Building2,
  ShieldCheck,
  Users,
  BarChart3,
  Briefcase,
  Flag,
  Mail,
  FileText,
  AlertTriangle,
  Settings,
  Search,
  Eye,
  Star,
  Ban,
  Download,
  Check,
  X,
  ShieldAlert,
  Send,
  Phone,
  UserCheck,
  AlertOctagon,
  ExternalLink,
} from "lucide-react";

interface CompaniesPageProps {
  onTriggerEmail?: (userId: string, campaignType: string) => void;
  onInitiateCall?: (
    user: User,
    type: "Standard Call" | "Emergency Call" | "Recruiter Support Call"
  ) => void;
}

export function CompaniesPage({
  onTriggerEmail,
  onInitiateCall,
}: CompaniesPageProps) {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<string>("all");

  // Database Data States
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [logs, setLogs] = useState<CompanyLog[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Status/Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [industryFilter, setIndustryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [verificationFilter, setVerificationFilter] = useState<string>("All");
  const [sizeFilter, setSizeFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [riskThreshold, setRiskThreshold] = useState<number>(50); // Fraud list slider

  // Selected Item Overlays
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<Company | null>(null);
  const [verifyNotes, setVerifyNotes] = useState<string>("");
  const [impersonateTarget, setImpersonateTarget] = useState<string | null>(null);

  // Communications Form State
  const [emailGroup, setEmailGroup] = useState<"all" | "verified" | "pending">(
    "all"
  );
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [emailSentStatus, setEmailSentStatus] = useState<string | null>(null);

  // Settings State Form
  const [requireDocs, setRequireDocs] = useState<boolean>(true);
  const [autoSpamFilter, setAutoSpamFilter] = useState<boolean>(true);
  const [minTrustScore, setMinTrustScore] = useState<number>(60);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<boolean>(false);

  // Fetch all database records on mount
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [compsData, recsData, jobsData, repsData, logsData, setsData] =
        await Promise.all([
          fetchCompanies(),
          fetchCompanyRecruiters(),
          fetchCompanyJobs(),
          fetchCompanyReports(),
          fetchCompanyLogs(),
          fetchCompanySettings(),
        ]);

      setCompanies(compsData);
      setRecruiters(recsData);
      setJobs(jobsData);
      setReports(repsData);
      setLogs(logsData);
      setSettings(setsData);

      // Pre-seed Settings form states
      if (setsData) {
        setRequireDocs(setsData.requireVerificationDocs);
        setAutoSpamFilter(setsData.autoFilterSpamJobs);
        setMinTrustScore(setsData.minTrustScoreToPost);
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to sync company operations database from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchCompanies(),
      fetchCompanyRecruiters(),
      fetchCompanyJobs(),
      fetchCompanyReports(),
      fetchCompanyLogs(),
      fetchCompanySettings(),
    ])
      .then(
        ([
          compsData,
          recsData,
          jobsData,
          repsData,
          logsData,
          setsData,
        ]) => {
          if (!active) {
            return;
          }

          setCompanies(compsData);
          setRecruiters(recsData);
          setJobs(jobsData);
          setReports(repsData);
          setLogs(logsData);
          setSettings(setsData);

          if (setsData) {
            setRequireDocs(
              setsData.requireVerificationDocs
            );
            setAutoSpamFilter(
              setsData.autoFilterSpamJobs
            );
            setMinTrustScore(
              setsData.minTrustScoreToPost
            );
          }
        }
      )
      .catch(() => {
        if (active) {
          setError(
            "Failed to sync company operations database from backend."
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

  // Cascading suspend actions
  const handleToggleSuspend = async (companyId: string, currentStatus: string) => {
    const isSuspended = currentStatus === "suspended";
    const confirmMsg = isSuspended
      ? "Are you sure you want to reactivate this company profile? Linked recruiters will be restored."
      : "CAUTION: Suspending this company will automatically expire all its active job listings and suspend all associated recruiter accounts. Proceed?";

    if (window.confirm(confirmMsg)) {
      try {
        await suspendCompany(companyId, !isSuspended);
        await loadAllData(); // Reload all cascading states
        alert(
          isSuspended
            ? "Company reactivated successfully."
            : "Company suspended, all recruiters and jobs deactivated."
        );
      } catch {
        alert("Action failed: suspension trigger error.");
      }
    }
  };

  // Verification status update
  const handleVerifySubmit = async (status: "verified" | "unverified") => {
    if (!showVerifyModal) return;
    try {
      await verifyCompany(showVerifyModal.id, status, verifyNotes);
      setShowVerifyModal(null);
      setVerifyNotes("");
      await loadAllData();
      alert(`Company marked as ${status}.`);
    } catch {
      alert("Verification update failed.");
    }
  };

  // Impersonate recruiter animation trigger
  const triggerImpersonate = (recruiterName: string) => {
    setImpersonateTarget(recruiterName);
    setTimeout(() => {
      setImpersonateTarget(null);
      alert(`Recruiter workspace simulation complete for ${recruiterName}.`);
    }, 2500);
  };

  // Submit Communications email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) {
      alert("Please fill in the subject and message body.");
      return;
    }
    try {
      const res = await sendRecruiterCampaign({
        recipientGroup: emailGroup,
        subject: emailSubject,
        body: emailBody,
      });
      setEmailSentStatus(
        `Email campaign sent successfully to ${res.recipientCount} recruiters.`
      );
      setEmailSubject("");
      setEmailBody("");
      await loadAllData();
      setTimeout(() => setEmailSentStatus(null), 5000);
    } catch {
      alert("Failed to deliver campaign.");
    }
  };

  // Update Settings policy
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = {
        ...settings,
        requireVerificationDocs: requireDocs,
        autoFilterSpamJobs: autoSpamFilter,
        minTrustScoreToPost: minTrustScore,
      };
      await saveCompanySettings(updated);
      setSettingsSavedMsg(true);
      await loadAllData();
      setTimeout(() => setSettingsSavedMsg(false), 3000);
    } catch {
      alert("Failed to save settings.");
    }
  };

  // Toggle Featured status on job
  const handleToggleFeatureJob = async (jobId: string) => {
    try {
      await toggleJobFeature(jobId);
      await loadAllData();
    } catch {
      alert("Failed to feature job.");
    }
  };

  // Toggle job active status
  const handleToggleJobStatus = async (jobId: string, currentStatus: string) => {
    try {
      const target = currentStatus === "active" ? "expired" : "active";
      await updateJobStatus(jobId, target);
      await loadAllData();
    } catch {
      alert("Failed to toggle job listing status.");
    }
  };

  // Dismiss report ticket
  const handleResolveReport = async (repId: string) => {
    try {
      await resolveCompanyReport(repId);
      await loadAllData();
      alert("Report ticket marked resolved.");
    } catch {
      alert("Failed to resolve report.");
    }
  };

  // Compute filtering lists
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = industryFilter === "All" || c.industry === industryFilter;
      const matchesStatus = statusFilter === "All" || c.accountStatus === statusFilter;
      const matchesVerif = verificationFilter === "All" || c.verificationStatus === verificationFilter;
      const matchesSize = sizeFilter === "All" || c.size === sizeFilter;
      const matchesLocation = locationFilter === "All" || c.location.toLowerCase().includes(locationFilter.toLowerCase());
      return matchesSearch && matchesIndustry && matchesStatus && matchesVerif && matchesSize && matchesLocation;
    });
  }, [companies, searchQuery, industryFilter, statusFilter, verificationFilter, sizeFilter, locationFilter]);

  const queueCompanies = useMemo(() => {
    return companies.filter((c) => c.verificationStatus === "pending");
  }, [companies]);

  const suspiciousCompanies = useMemo(() => {
    return companies.filter((c) => (c.riskScore || 0) >= riskThreshold);
  }, [companies, riskThreshold]);

  // Analytics helper lists
  const industryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => {
      counts[c.industry] = (counts[c.industry] || 0) + 1;
    });
    return Object.keys(counts).map((ind) => ({ name: ind, value: counts[ind] }));
  }, [companies]);

  const topHiringCompanies = useMemo(() => {
    return [...companies]
      .sort((a, b) => b.totalJobs - a.totalJobs)
      .slice(0, 5)
      .map((c) => ({ name: c.name, jobs: c.totalJobs }));
  }, [companies]);

  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#64748b"];

  if (loading && companies.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Syncing company registry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-12 text-center text-red-600">
        <AlertOctagon className="h-10 w-10 text-red-500" />
        <p className="mt-3 font-semibold">Error Loading Companies</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impersonate simulation backdrop */}
      {impersonateTarget && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm text-white">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-850 border border-slate-700 shadow-xl max-w-sm text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent"></div>
            <h3 className="text-lg font-bold">Impersonating Recruiter</h3>
            <p className="text-sm text-slate-400">
              Configuring session token and simulating administrative shadow access for{" "}
              <span className="text-blue-400 font-semibold">{impersonateTarget}</span>...
            </p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header title="Company & Recruiter Operations" />

      {/* Intro Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2 border-b border-slate-100">
        <p className="text-sm text-slate-500">
          Moderate enterprise listings, verify business credentials, audit recruiter roles, monitor fraud risk, and control job features.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto text-emerald-600 font-semibold text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE SECURITY SHIELD
        </div>
      </div>

      {/* Two Column Layout (Sub-sidebar & Workspace Content) */}
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Left Sub-Sidebar navigation */}
        <aside className="flex flex-col space-y-1">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-450">
            Navigation
          </div>
          {[
            { id: "all", label: "All Companies", icon: Building2 },
            { id: "queue", label: "Verification Queue", icon: ShieldCheck, badge: queueCompanies.length },
            { id: "recruiters", label: "Recruiters", icon: Users },
            { id: "analytics", label: "Hiring Analytics", icon: BarChart3 },
            { id: "jobs", label: "Jobs & Internships", icon: Briefcase },
            { id: "reports", label: "Reports & Flags", icon: Flag, badge: reports.filter(r => r.status === 'pending').length },
            { id: "communications", label: "Communications", icon: Mail },
            { id: "logs", label: "Activity Logs", icon: FileText },
            { id: "suspicious", label: "Suspicious Firms", icon: AlertTriangle, badge: suspiciousCompanies.length },
            { id: "settings", label: "Company Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedCompany(null);
                }}
                className={`flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-l-2 border-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Right workspace panel */}
        <section className="min-w-0 space-y-6">
          {/* TAB 1: ALL COMPANIES */}
          {activeTab === "all" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-xs text-slate-700 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All">All Industries</option>
                    <option value="Tech">Tech</option>
                    <option value="HR">HR</option>
                    <option value="Construction">Construction</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                  </select>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All">All Verification</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="unverified">Unverified</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <select
                    value={sizeFilter}
                    onChange={(e) => setSizeFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All">All Sizes</option>
                    <option value="1-10">1-10 Employees</option>
                    <option value="11-50">11-50 Employees</option>
                    <option value="51-200">51-200 Employees</option>
                    <option value="201-500">201-500 Employees</option>
                    <option value="500+">500+ Employees</option>
                  </select>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All">All Countries</option>
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="Nigeria">Nigeria</option>
                  </select>
                </div>
              </div>

              {/* Main directory Table */}
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450">
                      <th className="px-5 py-3.5">Company Name</th>
                      <th className="px-5 py-3.5">Industry</th>
                      <th className="px-5 py-3.5">Location</th>
                      <th className="px-5 py-3.5 text-center">Recruiters</th>
                      <th className="px-5 py-3.5 text-center">Open Jobs</th>
                      <th className="px-5 py-3.5">Verification</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No companies match the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {c.logo ? (
                                <img
                                  src={c.logo}
                                  alt="Logo"
                                  className="h-8 w-8 rounded-lg object-cover border border-slate-100"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600 text-sm">
                                  {c.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer" onClick={() => setSelectedCompany(c)}>
                                  {c.name}
                                </span>
                                <span className="block text-[10px] text-slate-400">Size: {c.size}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{c.industry}</td>
                          <td className="px-5 py-4 text-slate-500 truncate max-w-[150px]">{c.location}</td>
                          <td className="px-5 py-4 text-center text-slate-800 font-semibold">{c.recruiterCount}</td>
                          <td className="px-5 py-4 text-center text-slate-800 font-semibold">{c.totalJobs}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              c.verificationStatus === "verified"
                                ? "bg-emerald-50 text-emerald-700"
                                : c.verificationStatus === "pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-650"
                            }`}>
                              {c.verificationStatus === "verified" && <ShieldCheck className="h-3 w-3" />}
                              {c.verificationStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              c.accountStatus === "active"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-rose-50 text-rose-700"
                            }`}>
                              {c.accountStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                title="View Profile"
                                onClick={() => setSelectedCompany(c)}
                                className="rounded-lg p-1.5 text-slate-455 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Verify Audit"
                                onClick={() => {
                                  setShowVerifyModal(c);
                                  setVerifyNotes(c.verificationNotes || "");
                                }}
                                className="rounded-lg p-1.5 text-slate-455 hover:bg-slate-100 hover:text-blue-600"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title={c.accountStatus === "suspended" ? "Unsuspend" : "Suspend"}
                                onClick={() => handleToggleSuspend(c.id, c.accountStatus)}
                                className={`rounded-lg p-1.5 transition-colors ${
                                  c.accountStatus === "suspended"
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-rose-600 hover:bg-rose-50"
                                }`}
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: VERIFICATION QUEUE */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Pending Verification Audit</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {queueCompanies.length === 0 ? (
                  <div className="col-span-2 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                    No companies currently waiting in the verification queue.
                  </div>
                ) : (
                  queueCompanies.map((c) => (
                    <div key={c.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.logo}
                          alt="logo"
                          className="h-10 w-10 rounded-lg object-cover border border-slate-100"
                        />
                        <div>
                          <h3 className="font-bold text-slate-800">{c.name}</h3>
                          <p className="text-[11px] text-slate-405">{c.industry} &bull; {c.location}</p>
                        </div>
                      </div>

                      {c.verificationDocs && c.verificationDocs.length > 0 ? (
                        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
                          <div className="font-semibold text-slate-700">Submitted Documents:</div>
                          {c.verificationDocs.map((doc, idx) => (
                            <div key={idx} className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/50 pt-2 text-slate-600">
                              <div className="flex items-center gap-1.5 truncate">
                                <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <span className="truncate">{doc.name}</span>
                                <span className="text-[10px] text-slate-400">({doc.size})</span>
                              </div>
                              <button
                                type="button"
                                className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-500"
                              >
                                <Download className="h-3 w-3" /> Download
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-rose-500 font-semibold">⚠️ No documents uploaded!</p>
                      )}

                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowVerifyModal(c);
                            setVerifyNotes(c.verificationNotes || "");
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 font-semibold"
                        >
                          Audit Document Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowVerifyModal(c);
                            setVerifyNotes("Approved verification");
                          }}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RECRUITERS */}
          {activeTab === "recruiters" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Recruiters & Employers Directory</h2>
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450">
                      <th className="px-5 py-3.5">Recruiter</th>
                      <th className="px-5 py-3.5">Company</th>
                      <th className="px-5 py-3.5">Profession/Title</th>
                      <th className="px-5 py-3.5">Location</th>
                      <th className="px-5 py-3.5 text-center">Trust Score</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recruiters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No recruiters found.
                        </td>
                      </tr>
                    ) : (
                      recruiters.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {r.avatar ? (
                                <img
                                  src={r.avatar}
                                  alt="avatar"
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                                  {r.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-slate-850">{r.name}</span>
                                <span className="block text-[10px] text-slate-400">{r.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-semibold text-blue-600">{r.company || "—"}</td>
                          <td className="px-5 py-4 text-slate-650">{r.profession}</td>
                          <td className="px-5 py-4 text-slate-500">{r.city}, {r.country}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              (r.trustScore || 80) >= 85
                                ? "bg-emerald-50 text-emerald-700"
                                : (r.trustScore || 80) >= 70
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}>
                              {r.trustScore || 80}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              r.status === "Active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Recruiter Call Support"
                                onClick={() => onInitiateCall && onInitiateCall(r, "Recruiter Support Call")}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Contact Recruiter"
                                onClick={() => onTriggerEmail && onTriggerEmail(r.id, "Recruiter Warning Alert")}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Impersonate Recruiter"
                                onClick={() => triggerImpersonate(r.name)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-purple-600"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HIRING ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Industry Share Pie */}
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Companies by Industry Sector</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={industryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {industryChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Hirers Bar */}
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Top 5 Hiring Companies (Job Post Count)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topHiringCompanies}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <Tooltip cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recruitment Engagement Area */}
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Recruitment Platform Engagement (Weekly growth)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: "Week 1", views: 2400, applicants: 400, hires: 12 },
                      { name: "Week 2", views: 3100, applicants: 520, hires: 18 },
                      { name: "Week 3", views: 4200, applicants: 680, hires: 25 },
                      { name: "Week 4", views: 5600, applicants: 890, hires: 32 },
                      { name: "Week 5", views: 7800, applicants: 1200, hires: 48 },
                    ]} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="views" name="Job Views" stroke="#3b82f6" fill="url(#viewsGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="applicants" name="Applications Submitted" stroke="#8b5cf6" fill="url(#appsGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: JOBS & INTERNSHIPS */}
          {activeTab === "jobs" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Jobs & Internships Moderation</h2>
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-450">
                      <th className="px-5 py-3.5">Job Title</th>
                      <th className="px-5 py-3.5">Company</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Location</th>
                      <th className="px-5 py-3.5 text-center">Applicants</th>
                      <th className="px-5 py-3.5 text-center">Featured</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No jobs registered.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4 font-semibold text-slate-800">{j.title}</td>
                          <td className="px-5 py-4 font-semibold text-blue-600">{j.companyName}</td>
                          <td className="px-5 py-4 text-slate-550">{j.category}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              j.type === "Internship"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-blue-50 text-blue-700"
                            }`}>
                              {j.type}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500">{j.location}</td>
                          <td className="px-5 py-4 text-center font-bold text-slate-800">{j.applicantCount}</td>
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFeatureJob(j.id)}
                              className="text-slate-400 hover:text-amber-500 transition-colors"
                            >
                              <Star className={`h-4.5 w-4.5 ${j.isFeatured ? "fill-amber-400 text-amber-500" : ""}`} />
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              j.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {j.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleJobStatus(j.id, j.status)}
                              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                                j.status === "active"
                                  ? "border border-rose-200 text-rose-600 hover:bg-rose-50"
                                  : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {j.status === "active" ? "Expire Listing" : "Re-activate"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: REPORTS & FLAGS */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Platform Complaints & Incident Reports</h2>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                    No complaints registered.
                  </div>
                ) : (
                  reports.map((rep) => (
                    <div key={rep.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            {rep.reason.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-slate-400">Ticket ID: {rep.id}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          rep.status === "pending"
                            ? "bg-amber-50 text-amber-700 animate-pulse"
                            : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {rep.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-slate-800">
                          Target: {rep.targetType.toUpperCase()} -{" "}
                          <span className="text-blue-600 font-bold">{rep.targetName}</span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200/50">
                          {rep.description}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                        <div>Reported by: <span className="font-semibold text-slate-650">{rep.reportedBy}</span> on {rep.createdDate}</div>
                        {rep.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleResolveReport(rep.id)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                            >
                              Dismiss Ticket
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (rep.targetType === "company") {
                                  await handleToggleSuspend(rep.targetId, "active");
                                } else {
                                  // expire job
                                  await updateJobStatus(rep.targetId, "expired");
                                  alert("Job expired successfully.");
                                }
                                await handleResolveReport(rep.id);
                              }}
                              className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-500"
                            >
                              Take Action & Resolve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: COMMUNICATIONS */}
          {activeTab === "communications" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Compose Recruiter Broadcast Campaign</h3>
                {emailSentStatus && (
                  <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-250 p-4 text-xs font-semibold text-emerald-800">
                    {emailSentStatus}
                  </div>
                )}
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Recruiter Group</label>
                    <select
                      value={emailGroup}
                      onChange={(e) =>
                        setEmailGroup(
                          e.target.value as
                            | "all"
                            | "verified"
                            | "pending"
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="all">All Registered Recruiters & Employers</option>
                      <option value="verified">Recruiters of Verified Companies only</option>
                      <option value="pending">Recruiters of Pending Verification companies</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g., Mandatory Business Documentation Audit"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Body Message</label>
                    <textarea
                      rows={5}
                      placeholder="Write your email communications text here..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-550 shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" /> Dispatch Simulated Email
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 8: ACTIVITY LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Administrative Audit Trails</h2>
              <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden divide-y divide-slate-100 text-xs">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    No activity logs recorded.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-50/50 flex items-start gap-4">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600 shrink-0">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-850">
                          {log.adminName} <span className="font-normal text-slate-500">{log.action}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                          <span>Target: {log.targetType.toUpperCase()} ({log.targetName})</span>
                          <span>&bull;</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 9: SUSPICIOUS COMPANIES */}
          {activeTab === "suspicious" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-850">AI Fraud & Suspicious Risk Detection</h2>
                  <p className="text-xs text-slate-455">
                    Filters firms dynamically triggering custom risk alerts based on domain name, recruiter count, and applicant rejection ratios.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm text-xs">
                  <span className="font-semibold text-slate-500">Risk Threshold Score:</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(parseInt(e.target.value))}
                    className="w-24 accent-blue-600"
                  />
                  <span className="font-bold text-blue-600 min-w-[20px] text-right">{riskThreshold}%</span>
                </div>
              </div>

              <div className="space-y-3">
                {suspiciousCompanies.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                    No companies exceed the current risk score threshold.
                  </div>
                ) : (
                  suspiciousCompanies.map((c) => (
                    <div key={c.id} className="rounded-xl border border-rose-100 bg-rose-50/20 p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100/50 pb-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.logo}
                            alt="logo"
                            className="h-9 w-9 rounded-lg object-cover border border-rose-200"
                          />
                          <div>
                            <span className="font-bold text-slate-850">{c.name}</span>
                            <span className="block text-[10px] text-slate-400">{c.website}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            (c.riskScore || 0) >= 80
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            <ShieldAlert className="h-3 w-3 shrink-0" /> RISK SCORE: {c.riskScore}%
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            c.accountStatus === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {c.accountStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">Risk Warning Triggers:</div>
                        <ul className="space-y-1">
                          {c.riskReasons && c.riskReasons.map((reason, idx) => (
                            <li key={idx} className="text-xs text-slate-650 flex items-start gap-1.5">
                              <span className="text-rose-500 shrink-0 font-bold">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-rose-100/30 pt-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCompany(c)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 font-semibold"
                        >
                          Review Firm Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(c.id, c.accountStatus)}
                          className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                        >
                          {c.accountStatus === "suspended" ? "Unsuspend Firm" : "Suspend Firm"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 10: COMPANY SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Enterprise Verification & Posting Policies</h3>
                {settingsSavedMsg && (
                  <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-250 p-4 text-xs font-semibold text-emerald-800">
                    Configuration settings updated successfully.
                  </div>
                )}
                <form onSubmit={handleSaveSettings} className="space-y-5 text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-bold text-slate-800">Require Document Uploads for Verification</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Force new employer listings to submit legal business registers to unlock posting permissions.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequireDocs(!requireDocs)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        requireDocs ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        requireDocs ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-bold text-slate-800">Auto-scan Jobs for Spam/Fraud Indicators</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Automatically tag postings referencing key quick-cash keywords as expired pending audit.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSpamFilter(!autoSpamFilter)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoSpamFilter ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoSpamFilter ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Minimum Recruiter Trust Score to Post</label>
                    <p className="text-[11px] text-slate-400 mb-2">Block recruiters with trust score less than the threshold from starring featured postings.</p>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minTrustScore}
                      onChange={(e) => setMinTrustScore(parseInt(e.target.value))}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-550 shadow-sm"
                    >
                      Save Configuration Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* FULL COMPANY DETAIL SWITCHER OVERLAY */}
      {selectedCompany && (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs">
          <div className="h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-slide-left p-6 overflow-y-auto">
            {/* Overlay Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCompany.logo}
                  alt="logo"
                  className="h-12 w-12 rounded-xl object-cover border border-slate-250"
                />
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selectedCompany.name}</h2>
                  <a
                    href={selectedCompany.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    {selectedCompany.website} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Scrolling Panel */}
            <div className="flex-1 space-y-6 py-6 text-xs text-slate-650">
              {/* Grid block: basic metadata */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="font-bold text-slate-800 mb-2">Company Information</div>
                  <div className="space-y-1.5">
                    <div><span className="text-slate-400">Industry:</span> {selectedCompany.industry}</div>
                    <div><span className="text-slate-400">Location:</span> {selectedCompany.location}</div>
                    <div><span className="text-slate-400">Size:</span> {selectedCompany.size}</div>
                    <div><span className="text-slate-400">Joined:</span> {selectedCompany.createdDate}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="font-bold text-slate-800 mb-2">Administrative Status</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Verification:</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        selectedCompany.verificationStatus === "verified"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {selectedCompany.verificationStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Account status:</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        selectedCompany.accountStatus === "active" ? "bg-blue-50 text-blue-750" : "bg-rose-50 text-rose-750"
                      }`}>
                        {selectedCompany.accountStatus.toUpperCase()}
                      </span>
                    </div>
                    <div><span className="text-slate-400">Fraud Risk Index:</span> <span className="font-bold text-rose-600">{selectedCompany.riskScore}%</span></div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-bold text-slate-800 mb-1.5">About</h3>
                <p className="leading-relaxed text-slate-600 bg-slate-50/30 border border-slate-100 rounded-lg p-3">
                  {selectedCompany.description}
                </p>
              </div>

              {/* Linked Recruiters */}
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Company Administrators & Recruiters</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Profession</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recruiters.filter(r => r.company && r.company.toLowerCase() === selectedCompany.name.toLowerCase()).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-center text-slate-400">No recruiters registered.</td>
                        </tr>
                      ) : (
                        recruiters
                          .filter(r => r.company && r.company.toLowerCase() === selectedCompany.name.toLowerCase())
                          .map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/30">
                              <td className="px-4 py-3 font-semibold text-slate-700">{rec.name}</td>
                              <td className="px-4 py-3 text-slate-500">{rec.profession}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onInitiateCall && onInitiateCall(rec, "Recruiter Support Call")}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => triggerImpersonate(rec.name)}
                                    className="p-1 text-slate-400 hover:text-purple-650 rounded"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Job Postings */}
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Job and Internship Openings</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2">Role Title</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2 text-center">Featured</th>
                        <th className="px-4 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.filter(j => j.companyId === selectedCompany.id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-center text-slate-400">No active job listings.</td>
                        </tr>
                      ) : (
                        jobs
                          .filter(j => j.companyId === selectedCompany.id)
                          .map((job) => (
                            <tr key={job.id} className="hover:bg-slate-50/30">
                              <td className="px-4 py-3 font-semibold text-slate-700">{job.title}</td>
                              <td className="px-4 py-3">{job.type}</td>
                              <td className="px-4 py-3 text-slate-500">{job.category}</td>
                              <td className="px-4 py-3 text-center">
                                <Star className={`h-4 w-4 mx-auto ${job.isFeatured ? "fill-amber-400 text-amber-500" : "text-slate-300"}`} />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  job.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                }`}>
                                  {job.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Company Specific Analytics */}
              {selectedCompany.analytics && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">Enterprise Hiring Volume Insights</h3>
                  <div className="grid gap-4 grid-cols-3 text-center">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Job Views</div>
                      <div className="text-lg font-extrabold text-slate-800 mt-1">{selectedCompany.analytics.views}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applicants</div>
                      <div className="text-lg font-extrabold text-slate-800 mt-1">{selectedCompany.analytics.applicants}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hires Made</div>
                      <div className="text-lg font-extrabold text-slate-800 mt-1">{selectedCompany.analytics.hires}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => handleToggleSuspend(selectedCompany.id, selectedCompany.accountStatus)}
                className={`rounded-lg px-4 py-2 font-bold transition-all ${
                  selectedCompany.accountStatus === "suspended"
                    ? "bg-emerald-600 text-white hover:bg-emerald-550"
                    : "bg-rose-600 text-white hover:bg-rose-550"
                }`}
              >
                {selectedCompany.accountStatus === "suspended" ? "Unsuspend Company" : "Suspend Company"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCompany(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 font-bold text-slate-650 hover:bg-slate-50"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERIFY NOTES COMPOSER DIALOG */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Verify Company: {showVerifyModal.name}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Verification Notes</label>
              <textarea
                rows={3}
                placeholder="Include registry validation logs or audit references..."
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVerifyModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerifySubmit("unverified")}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-550"
              >
                Reject Verification
              </button>
              <button
                type="button"
                onClick={() => handleVerifySubmit("verified")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-550"
              >
                Verify Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
