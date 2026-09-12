import { useEffect, useMemo, useState } from "react";
import { fetchUsers, type User } from "../services/api";
import { Header } from "../components/layout/Header";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ChevronRight,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

interface UsersPageProps {
  onTriggerEmail?: (userId: string, campaignType: string) => void;
  onInitiateCall?: (user: User, type: 'Standard Call' | 'Emergency Call' | 'Recruiter Support Call') => void;
}

const activitySeries = [
  { week: "Week 1", onboarded: 12, active: 82 },
  { week: "Week 2", onboarded: 18, active: 91 },
  { week: "Week 3", onboarded: 21, active: 88 },
  { week: "Week 4", onboarded: 28, active: 94 },
  { week: "Week 5", onboarded: 24, active: 96 },
];

const filters = ["All", "Active", "Pending", "Suspended"];
const roles = ["All", "User", "Recruiter", "Employer"];

export function UsersPage({ onTriggerEmail, onInitiateCall }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");
  const [studentFilter, setStudentFilter] = useState("All");
  const [selectedUserId, setSelectedUserId] = useState("admin-1");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchUsers();
        setUsers(data);
        if (data.length > 0) {
          // Select the first user as default
          setSelectedUserId(data[0].id);
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch users directory from backend"
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery = [user.name, user.email, user.company || "", user.role]
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesVerif =
        verificationFilter === "All" ||
        (verificationFilter === "Verified" && user.isVerified === true) ||
        (verificationFilter === "Unverified" && user.isVerified !== true);
      const matchesStudent =
        studentFilter === "All" ||
        (studentFilter === "Student" && user.isStudent === true) ||
        (studentFilter === "Professional" && user.isStudent !== true);
      return matchesQuery && matchesStatus && matchesRole && matchesVerif && matchesStudent;
    });
  }, [users, searchQuery, statusFilter, roleFilter, verificationFilter, studentFilter]);

  const selectedUser = useMemo(() => {
    return users.find((user) => user.id === selectedUserId) || users[0] || null;
  }, [users, selectedUserId]);

  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.status === "Active").length;
    const pending = users.filter((user) => user.status === "Pending").length;
    const flagged = users.filter((user) => user.status === "Suspended").length;
    return { total, active, pending, flagged };
  }, [users]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-12 text-center text-red-600">
        <p className="font-semibold">Error Loading Users</p>
        <p className="mt-2 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <Header title="People & Profile Intelligence" />

      {/* Description & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mt-3 pb-2">
        <p className="text-sm text-slate-500">
          Manage platform users with advanced filters, trust scoring, verification flags, and activity insights.
        </p>
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Synced</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total users</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
              <p className="mt-1 text-[11px] text-slate-455">Accounts in directory</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active accounts</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.active}</p>
              <p className="mt-1 text-[11px] text-emerald-600 font-medium">Regularly engaged</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending checks</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.pending}</p>
              <p className="mt-1 text-[11px] text-slate-455">Verifications to audit</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flagged accounts</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{summary.flagged}</p>
              <p className="mt-1 text-[11px] text-rose-600 font-medium">Action required</p>
            </div>
          </div>

          {/* Activity Trends */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">User activity trends</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Weekly account activation and onboarding progress across new signups.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-50 border border-slate-100 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Trust score boost
                </span>
                <span className="rounded-full bg-blue-50 border border-blue-105 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-600">
                  AI review active
                </span>
              </div>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activitySeries} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="activeColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="onboardedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip wrapperClassName="rounded-xl border border-slate-100 bg-white shadow-lg text-xs" />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="#0ea5e9"
                    fill="url(#activeColor)"
                    strokeWidth={2.5}
                    name="Active users"
                  />
                  <Area
                    type="monotone"
                    dataKey="onboarded"
                    stroke="#8b5cf6"
                    fill="url(#onboardedColor)"
                    strokeWidth={2.5}
                    name="Onboarded"
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Directory Panel */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">User directory</h2>
                <p className="mt-1 text-xs text-slate-400">Filter by role and review profile flags.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm flex-1 sm:flex-none">
                  <Search className="mr-2 h-3.5 w-3.5 text-slate-450" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search name, email, company"
                    className="w-full sm:w-64 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5 items-center">
              {filters.map((value) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    statusFilter === value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {value}
                </button>
              ))}
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="rounded-xl border border-slate-250 bg-white px-3.5 py-1.5 text-xs text-slate-700 outline-none"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <select
                value={verificationFilter}
                onChange={(event) => setVerificationFilter(event.target.value)}
                className="rounded-xl border border-slate-250 bg-white px-3.5 py-1.5 text-xs text-slate-700 outline-none"
              >
                <option value="All">All Verification</option>
                <option value="Verified">Verified Only</option>
                <option value="Unverified">Unverified Only</option>
              </select>
              <select
                value={studentFilter}
                onChange={(event) => setStudentFilter(event.target.value)}
                className="rounded-xl border border-slate-250 bg-white px-3.5 py-1.5 text-xs text-slate-700 outline-none"
              >
                <option value="All">All Status Types</option>
                <option value="Student">Students Only</option>
                <option value="Professional">Professionals Only</option>
              </select>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Profile</th>
                    <th className="px-3 py-2.5 font-semibold">Role</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Trust</th>
                    <th className="px-3 py-2.5 font-semibold">Last Active</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/50 ${
                        selectedUserId === user.id ? "bg-slate-50/70" : ""
                      }`}
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="h-9 w-9 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-[11px] font-bold">
                              {user.name
                                .split(" ")
                                .map((token) => token[0])
                                .join("")}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">{user.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-slate-600 font-medium">{user.role}</td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          user.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : user.status === "Pending"
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-semibold text-slate-800">{user.trustScore}%</td>
                      <td className="px-3 py-3.5 text-slate-400">{user.lastActive || "Just now"}</td>
                      <td className="px-3 py-3.5 text-slate-400">
                        <ChevronRight className="h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                        No matching users found. Try a different filter or search term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Selected User Details Sidebar */}
        {selectedUser && (
          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="h-14 w-14 rounded-xl object-cover border border-slate-100 shadow-sm"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-xl font-bold border border-blue-100 shadow-sm">
                    {selectedUser.name
                      .split(" ")
                      .map((token) => token[0])
                      .join("")}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inspected Profile</p>
                  <h2 className="mt-1 text-base font-bold text-slate-900">{selectedUser.name}</h2>
                  <p className="text-xs text-slate-500">
                    {selectedUser.role} {selectedUser.company ? `• ${selectedUser.company}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3.5">
                <div className="rounded-xl bg-slate-50/50 p-3.5 border border-slate-100/50">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Profile badge</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">{selectedUser.badge || "Standard Member"}</p>
                </div>
                
                <div className="grid gap-2.5 rounded-xl border border-slate-100 bg-white p-3.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Joined</span>
                    <span className="font-semibold text-slate-800">{selectedUser.joinedDate || "Unknown"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Location</span>
                    <span className="font-semibold text-slate-800">
                      {selectedUser.city && selectedUser.country ? `${selectedUser.city}, ${selectedUser.country}` : "Global"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Plan</span>
                    <span className="font-semibold text-slate-800">{selectedUser.plan || "Starter"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Phone</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        onClick={() => {
                          if (selectedUser.phone) {
                            navigator.clipboard.writeText(selectedUser.phone);
                            alert("Copied phone number to clipboard!");
                          }
                        }}
                        title="Click to copy phone number"
                        className="font-semibold text-slate-800 cursor-pointer hover:text-blue-650 transition-colors"
                      >
                        {selectedUser.phone || "—"}
                      </span>
                      {selectedUser.phone && (
                        <button
                          onClick={() => onInitiateCall?.(selectedUser, 'Standard Call')}
                          className="p-1 bg-slate-50 text-slate-500 hover:text-blue-650 hover:bg-blue-50 rounded-lg transition-all"
                          title="Dial Standard Call"
                        >
                          <Phone className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedUser.emergencyPhone && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Emergency</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={() => {
                            navigator.clipboard.writeText(selectedUser.emergencyPhone!);
                            alert("Copied emergency contact to clipboard!");
                          }}
                          title="Click to copy emergency number"
                          className="font-semibold text-slate-805 cursor-pointer hover:text-red-650 transition-colors"
                        >
                          {selectedUser.emergencyPhone}
                        </span>
                        <button
                          onClick={() => onInitiateCall?.(selectedUser, 'Emergency Call')}
                          className="p-1 bg-slate-50 text-slate-500 hover:text-red-655 hover:bg-red-50 rounded-lg transition-all"
                          title="Dial Emergency Call"
                        >
                          <Phone className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50/50 p-3.5 border border-slate-100/50">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Trust score</p>
                  <div className="mt-2 flex items-end gap-3">
                    <span className="text-3xl font-extrabold text-slate-800">{(selectedUser.trustScore ?? 0)}%</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      (selectedUser.trustScore ?? 0) >= 85 
                        ? "bg-emerald-100 text-emerald-700" 
                        : (selectedUser.trustScore ?? 0) >= 60 
                        ? "bg-amber-100 text-amber-700" 
                        : "bg-rose-105 text-rose-700"
                    }`}>
                      {(selectedUser.trustScore ?? 0) >= 85 ? "Strong" : (selectedUser.trustScore ?? 0) >= 60 ? "Moderate" : "Weak"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact controls */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Communications</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Dispatch simulated alerts or calls.</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => onTriggerEmail?.(selectedUser.id, "direct")}
                  className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 px-4 py-2.5 text-xs font-bold text-white hover:opacity-95 transition-all shadow-sm"
                >
                  <span>Send email message</span>
                  <Mail className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onTriggerEmail?.(selectedUser.id, "verification")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <span>Request verification</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                </button>
                <button
                  onClick={() => onInitiateCall?.(selectedUser, 'Recruiter Support Call')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <span>Call via CRM support</span>
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Biography Summary */}
            <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Profile summary</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{selectedUser.bio || "No biography provided."}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-slate-50/50 p-3 border border-slate-100/50 text-xs">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Next review</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedUser.status === "Pending" ? "Upload proofs" : "Routine check"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50/50 p-3 border border-slate-100/50 text-xs">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Compliance</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedUser.status === "Suspended" ? "Auditing block" : "All clean"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
