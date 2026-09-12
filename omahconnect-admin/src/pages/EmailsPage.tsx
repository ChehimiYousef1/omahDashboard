import React, { useEffect, useState } from "react";
import { fetchUsers, fetchEmails, sendEmail, fetchApplications, type User, type EmailRecord, type Application } from "../services/api";
import { Header } from "../components/layout/Header";
import { Send, History, Mail, AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";

interface EmailsPageProps {
  initialTargetUserId?: string | null;
  initialCampaignType?: string | null;
  initialRecipientType?: "direct" | "applicant" | "bulk";
  onClearInitialState?: () => void;
}

const TEMPLATES = {
  announcement: {
    subject: "📢 Important: New Platform Features & Guidelines",
    body: "Hello,\n\nWe are excited to share some major updates to OMAHCONNECT! We have launched a new job-matching algorithm that improves recommendations by 30%, alongside enhanced portfolio security rules.\n\nPlease log in and review your updated profile dashboards.\n\nBest regards,\nOMAHCONNECT Administration Team"
  },
  alert: {
    subject: "💼 Career Alert: New Opportunities Match Your Profile",
    body: "Hello,\n\nNew job and internship openings matching your professional background have been posted on OMAHCONNECT today!\n\nLog in now to apply directly and chat with verified employers.\n\nBest regards,\nOMAHCONNECT Careers"
  },
  warning: {
    subject: "⚠️ Warning: Account Compliance Verification Required",
    body: "Hello,\n\nOur system detected multiple compliance flags or reports on your profile regarding professional conduct or suspicious activity.\n\nPlease log in and complete verification immediately, or reply to this notice with your credentials, to avoid account restriction.\n\nBest regards,\nOMAHCONNECT Security"
  },
  verification: {
    subject: "🛡️ Action Needed: Verify Your Professional Identity",
    body: "Hello,\n\nTo ensure safety across OMAHCONNECT, we require recruiters and employers to verify their credentials. Please upload your identity documents or company registration details inside your settings panel.\n\nOnce completed, your profile will receive the 'Verified' badge.\n\nBest regards,\nOMAHCONNECT Verifications"
  },
  direct: {
    subject: "Message from OMAHCONNECT Admin",
    body: "Hello,\n\nI am writing to connect with you regarding your recent platform activity. [Add message details here...]\n\nBest regards,\nOMAHCONNECT Admin"
  }
};

type TemplateKey = keyof typeof TEMPLATES;

export function EmailsPage({ initialTargetUserId, initialCampaignType, initialRecipientType, onClearInitialState }: EmailsPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerLoading, setComposerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Composer Form States
  const [recipientType, setRecipientType] = useState<"direct" | "applicant" | "bulk">("direct");
  const [recipientId, setRecipientId] = useState("");
  const [recipientGroup, setRecipientGroup] = useState<"all" | "students" | "professionals" | "verified" | "unverified">("all");
  const [campaignType, setCampaignType] = useState<TemplateKey>("direct");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [usersData, emailsData, applicantsData] = await Promise.all([
          fetchUsers(),
          fetchEmails(),
          fetchApplications()
        ]);
        setUsers(usersData);
        setEmails(emailsData);
        setApplicants(applicantsData);

        // Prepopulate if initial state exists
        if (initialTargetUserId) {
          if (initialRecipientType) {
            setRecipientType(initialRecipientType);
          } else {
            setRecipientType("direct");
          }
          setRecipientId(initialTargetUserId);
        }
        if (initialCampaignType && TEMPLATES[initialCampaignType as TemplateKey]) {
          const key = initialCampaignType as TemplateKey;
          setCampaignType(key);
          setSubject(TEMPLATES[key].subject);
          setBody(TEMPLATES[key].body);
        } else {
          setSubject(TEMPLATES.direct.subject);
          setBody(TEMPLATES.direct.body);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load database. Ensure backend server is running."
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [initialTargetUserId, initialCampaignType, initialRecipientType]);

  // Handle template selection
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as TemplateKey;
    setCampaignType(key);
    if (TEMPLATES[key]) {
      setSubject(TEMPLATES[key].subject);
      setBody(TEMPLATES[key].body);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setComposerLoading(true);

    if ((recipientType === "direct" || recipientType === "applicant") && !recipientId) {
      setError(`Please select a direct recipient ${recipientType}.`);
      setComposerLoading(false);
      return;
    }

    if (!subject || !body) {
      setError("Please fill in the subject and message body.");
      setComposerLoading(false);
      return;
    }

    try {
      const result = await sendEmail({
        recipientType,
        recipientId: (recipientType === "direct" || recipientType === "applicant") ? recipientId : undefined,
        recipientGroup: recipientType === "bulk" ? recipientGroup : undefined,
        subject,
        body,
        campaignType
      });

      if (result.success) {
        setSuccessMsg(result.message);
        // Refresh emails history list
        const updatedEmails = await fetchEmails();
        setEmails(updatedEmails);
        
        // Reset composer
        if (!initialTargetUserId) {
          setRecipientId("");
          setSubject(TEMPLATES.direct.subject);
          setBody(TEMPLATES.direct.body);
          setCampaignType("direct");
        }
        
        if (onClearInitialState) {
          onClearInitialState();
        }
      }
    } catch (err: unknown) {
      console.error(err);

      let apiMessage: string | undefined;

      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
        const response =
          (
            err as {
              response?: {
                data?: {
                  error?: unknown;
                };
              };
            }
          ).response;

        if (
          typeof response?.data?.error ===
          "string"
        ) {
          apiMessage = response.data.error;
        }
      }

      setError(
        apiMessage ||
        "Failed to simulate email delivery."
      );
    } finally {
      setComposerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <Header title="Campaign Outreach Hub" />

      {/* Description & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2">
        <p className="text-sm text-slate-500">
          Draft direct messages, bulk announcement updates, warnings, and job alerts to OMAHCONNECT users.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outreach Dispatch Gateway</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        {/* Email Composer */}
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
              <Mail className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Campaign Composer</h2>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            {/* Target Select */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Send To
                </label>
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as "direct" | "applicant" | "bulk")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  <option value="direct">Single User (Direct Email)</option>
                  <option value="applicant">Single Applicant (Direct Email)</option>
                  <option value="bulk">Bulk Group (Campaign)</option>
                </select>
              </div>

              {recipientType === "direct" ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select User
                  </label>
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">-- Choose User --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email} - {u.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : recipientType === "applicant" ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Applicant
                  </label>
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="">-- Choose Applicant --</option>
                    {applicants.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.userName} ({a.userEmail} - {a.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Group Filter
                  </label>
                  <select
                    value={recipientGroup}
                    onChange={(e) => setRecipientGroup(
                      e.target.value as
                        | "all"
                        | "students"
                        | "professionals"
                        | "verified"
                        | "unverified"
                    )}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="all">All Registered Users</option>
                    <option value="students">Students Only</option>
                    <option value="professionals">Professionals Only</option>
                    <option value="verified">Verified Users Only</option>
                    <option value="unverified">Unverified Users Only</option>
                  </select>
                </div>
              )}
            </div>

            {/* Campaign Template Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Load Template Preset
              </label>
              <select
                value={campaignType}
                onChange={handleTemplateChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              >
                <option value="direct">Direct Custom Message</option>
                <option value="announcement">📢 Announcement (Feature updates/policies)</option>
                <option value="alert">💼 Job/Internship Alert</option>
                <option value="warning">⚠️ Warning Notice (Compliance violation)</option>
                <option value="verification">🛡️ Verification Call-to-action</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Action Required: Please verify your credentials"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Message Body
              </label>
              <textarea
                required
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email body..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono transition-all"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={composerLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/10 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {composerLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Simulate Email Send</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </section>

        {/* Sent Campaigns Outbox */}
        <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="p-2 bg-purple-50 text-purple-500 rounded-lg">
                <History className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Sent Campaigns & History</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
              {emails.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No email campaigns have been sent yet.
                </div>
              ) : (
                emails
                  .slice()
                  .reverse()
                  .map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 space-y-2 hover:bg-slate-50/50 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                          e.campaignType === "warning"
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : e.campaignType === "verification"
                            ? "bg-sky-50 text-sky-600 border border-sky-100"
                            : e.campaignType === "announcement"
                            ? "bg-purple-50 text-purple-600 border border-purple-100"
                            : e.campaignType === "alert"
                            ? "bg-orange-50 text-orange-600 border border-orange-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {e.campaignType}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(e.sentAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{e.subject}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          <strong>Recipients:</strong> {e.recipientSummary} ({e.recipientCount} user{e.recipientCount > 1 ? "s" : ""})
                        </p>
                      </div>
                      <div className="border-t border-slate-100/70 pt-2 mt-1">
                        <p className="text-[11px] text-slate-400 line-clamp-2 italic font-mono">
                          "{e.body}"
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-emerald-600 mt-1">
                        <UserCheck className="h-3 w-3" />
                        <span>Simulated Delivered</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
